package com.clientflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ClientFlowApplication {
  public static void main(String[] args) {
    SpringApplication.run(ClientFlowApplication.class, args);
  }
}
