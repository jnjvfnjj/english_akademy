package com.school.crm.security;

import com.school.crm.model.entity.StaffAccount;
import com.school.crm.service.StaffAuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class BearerTokenFilter extends OncePerRequestFilter {

    private final StaffAuthService authService;

    public BearerTokenFilter(StaffAuthService authService) {
        this.authService = authService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            StaffAccount account = authService.authenticate(authorization.substring("Bearer ".length()));
            if (account != null) {
                var authentication = new UsernamePasswordAuthenticationToken(
                        account.getEmail(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + account.getRole()))
                );
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }
}
