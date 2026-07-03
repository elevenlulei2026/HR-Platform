package com.hrplatform.platform.auth;

import java.util.Set;

public record AuthUser(
    Long id,
    String username,
    Set<String> roles,
    Set<String> permissions,
    String dataScope
) {}

