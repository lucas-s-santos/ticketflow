package com.ticketflow.backend.controller;

import com.ticketflow.backend.dto.OrganizerDashboardDto;
import com.ticketflow.backend.entity.User;
import com.ticketflow.backend.repository.UserRepository;
import com.ticketflow.backend.service.OrganizerDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizer")
@RequiredArgsConstructor
public class OrganizerController {

    private final OrganizerDashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping("/dashboard")
    public OrganizerDashboardDto dashboard(@AuthenticationPrincipal UserDetails userDetails) {
        User organizer = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado no contexto de segurança"));
        return dashboardService.getDashboard(organizer.getId());
    }
}
