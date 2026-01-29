package com.jobmanager.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "platform")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Platform {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "base_url")
    private String baseUrl;
}