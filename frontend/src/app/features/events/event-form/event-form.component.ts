import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../event.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-6 py-10">
      <a routerLink="/events" class="text-sm text-indigo-600 hover:underline mb-4 inline-block">← Voltar</a>
      <h2 class="text-2xl font-bold text-gray-900 mb-6">
        {{ isEditing() ? 'Editar Evento' : 'Novo Evento' }}
      </h2>

      @if (errorMsg()) {
        <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {{ errorMsg() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Evento</label>
          <input
            type="text"
            formControlName="name"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          @if (form.controls.name.invalid && form.controls.name.touched) {
            <p class="mt-1 text-xs text-red-600">Nome obrigatório</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            formControlName="description"
            rows="3"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Data e Hora</label>
          <input
            type="datetime-local"
            formControlName="date"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          @if (form.controls.date.invalid && form.controls.date.touched) {
            <p class="mt-1 text-xs text-red-600">Data obrigatória</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Local</label>
          <input
            type="text"
            formControlName="location"
            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          @if (form.controls.location.invalid && form.controls.location.touched) {
            <p class="mt-1 text-xs text-red-600">Local obrigatório</p>
          }
        </div>

        <!-- Setores: FormArray permite lista dinâmica de controles -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-gray-800">Setores</h3>
            <button
              type="button"
              (click)="addSector()"
              class="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              + Adicionar setor
            </button>
          </div>

          @if (sectors.length === 0) {
            <p class="text-sm text-gray-500 italic">Nenhum setor adicionado.</p>
          }

          @for (sector of sectors.controls; track $index) {
            <div [formGroup]="getSectorGroup($index)" class="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
              <div class="flex justify-between items-center mb-3">
                <span class="text-sm font-medium text-gray-700">Setor {{ $index + 1 }}</span>
                <button
                  type="button"
                  (click)="removeSector($index)"
                  class="text-xs text-red-600 hover:text-red-800"
                >
                  Remover
                </button>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-3">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Nome do setor</label>
                  <input
                    type="text"
                    formControlName="name"
                    class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Pista, VIP, Camarote"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Capacidade</label>
                  <input
                    type="number"
                    formControlName="capacity"
                    min="1"
                    class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    formControlName="price"
                    min="0.01"
                    step="0.01"
                    class="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="submit"
            [disabled]="loading()"
            class="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {{ loading() ? 'Salvando...' : (isEditing() ? 'Salvar alterações' : 'Criar evento') }}
          </button>
          <a
            routerLink="/events"
            class="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  `,
})
export class EventFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventService = inject(EventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  loading = signal(false);
  errorMsg = signal('');
  isEditing = signal(false);
  private eventId: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    location: ['', Validators.required],
    sectors: this.fb.array([]),
  });

  get sectors(): FormArray {
    return this.form.get('sectors') as FormArray;
  }

  // FormGroup digitado para o template acessar via índice
  getSectorGroup(index: number) {
    return this.sectors.at(index) as ReturnType<typeof this.fb.group>;
  }

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.isEditing.set(true);
      this.eventService.getEventById(this.eventId).subscribe({
        next: (event) => {
          // Pré-popula o formulário com os dados do evento existente.
          // datetime-local exige o formato "YYYY-MM-DDTHH:mm"
          const localDate = new Date(event.date).toISOString().slice(0, 16);
          this.form.patchValue({
            name: event.name,
            description: event.description ?? '',
            date: localDate,
            location: event.location,
          });
          event.sectors.forEach(s => this.addSector(s.name, s.capacity, s.price));
        },
        error: () => this.router.navigate(['/events']),
      });
    }
  }

  addSector(name = '', capacity = 0, price = 0): void {
    this.sectors.push(this.fb.group({
      name: [name, Validators.required],
      capacity: [capacity, [Validators.required, Validators.min(1)]],
      price: [price, [Validators.required, Validators.min(0.01)]],
    }));
  }

  removeSector(index: number): void {
    this.sectors.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    const raw = this.form.getRawValue();
    // Converte datetime-local (sem timezone) para ISO com offset UTC
    const body = {
      name: raw.name!,
      description: raw.description ?? undefined,
      date: new Date(raw.date!).toISOString(),
      location: raw.location!,
      sectors: raw.sectors.map((s: any) => ({
        name: s.name,
        capacity: Number(s.capacity),
        price: Number(s.price),
      })),
    };

    const request$ = this.isEditing()
      ? this.eventService.updateEvent(this.eventId!, body)
      : this.eventService.createEvent(body);

    request$.subscribe({
      next: () => this.router.navigate(['/events']),
      error: (err) => {
        this.errorMsg.set(err.error?.message ?? 'Erro ao salvar evento.');
        this.loading.set(false);
      },
    });
  }
}
