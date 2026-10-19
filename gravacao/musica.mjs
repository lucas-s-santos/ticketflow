// Põe uma música num vídeo já montado (o LinkedIn não tem biblioteca de
// músicas como o Instagram: o som precisa vir no arquivo). O vídeo não é
// recodificado — sai em segundos.
//
//   node musica.mjs saida/canhoto-linkedin.mp4 caminho/da/musica.mp3
//   → saida/canhoto-linkedin-com-musica.mp4
//
// A música repete se for mais curta que o vídeo, entra em 1 s, sai em 2,5 s no
// fim e é nivelada a -16 LUFS (o volume que as redes usam).
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ffmpeg } from './lib/gravador.mjs';

const [video, musica] = process.argv.slice(2);
if (!video || !musica) {
  console.log('uso: node musica.mjs <video.mp4> <musica.mp3>');
  process.exit(1);
}

const duracao = await new Promise((ok, falha) => {
  const p = spawn(process.env.FFPROBE ?? 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]);
  let saida = '';
  p.stdout.on('data', (d) => { saida += d; });
  p.on('error', falha);
  p.on('exit', () => ok(Number(saida.trim())));
});

const destino = video.replace(/\.mp4$/i, '-com-musica.mp4');
await ffmpeg([
  '-y', '-v', 'error',
  '-i', video,
  '-stream_loop', '-1', '-i', musica,
  '-filter_complex',
  `[1:a]atrim=0:${duracao.toFixed(3)},asetpts=PTS-STARTPTS,loudnorm=I=-16:TP=-1.5:LRA=11,`
    + `afade=t=in:d=1,afade=t=out:st=${Math.max(0, duracao - 2.5).toFixed(3)}:d=2.5,aresample=48000[a]`,
  '-map', '0:v', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-t', duracao.toFixed(3), '-movflags', '+faststart',
  destino,
]);
console.log(`  pronto: ${path.relative(process.cwd(), destino)} (${duracao.toFixed(1)} s)`);
