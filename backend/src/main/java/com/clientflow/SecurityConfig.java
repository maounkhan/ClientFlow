package com.clientflow;

import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.*;
import org.springframework.security.web.csrf.*;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService userDetailsService(JdbcTemplate db) {
    return email -> {
      var rows =
          db.queryForList(
              "SELECT * FROM users WHERE email=? AND enabled=TRUE", email.toLowerCase(Locale.ROOT));
      if (rows.isEmpty()) throw new UsernameNotFoundException("Invalid sign-in");
      var u = rows.getFirst();
      return User.withUsername(u.get("email").toString())
          .password(u.get("password_hash").toString())
          .roles(u.get("role").toString())
          .build();
    };
  }

  @Bean
  AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
    var p = new DaoAuthenticationProvider(users);
    p.setPasswordEncoder(encoder);
    return new ProviderManager(p);
  }

  @Bean
  SecurityContextRepository contextRepository() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http, SecurityContextRepository repo) throws Exception {
    return http.securityContext(c -> c.securityContextRepository(repo))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/v1/auth/**",
                        "/actuator/health",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/v3/api-docs/**",
                        "/",
                        "/index.html",
                        "/assets/**",
                        "/favicon.svg")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .csrf(c -> c.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (q, s, x) -> {
                          s.setStatus(401);
                          s.setContentType("application/json");
                          s.getWriter().write("{\"message\":\"Sign in to continue\"}");
                        })
                    .accessDeniedHandler(
                        (q, s, x) -> {
                          s.setStatus(403);
                          s.setContentType("application/json");
                          s.getWriter()
                              .write(
                                  "{\"message\":\"You do not have permission for this action."
                                      + " Refresh if your session expired.\"}");
                        }))
        .logout(
            l ->
                l.logoutUrl("/api/v1/auth/logout")
                    .logoutSuccessHandler((q, s, a) -> s.setStatus(204)))
        .headers(h -> h.contentTypeOptions(c -> {}).frameOptions(f -> f.deny()))
        .build();
  }
}
