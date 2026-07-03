package com.hrplatform.platform.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {
  private final SysUserMapper sysUserMapper;
  private final PasswordHasher passwordHasher;
  private final JwtService jwtService;

  public AuthService(SysUserMapper sysUserMapper, PasswordHasher passwordHasher, JwtService jwtService) {
    this.sysUserMapper = sysUserMapper;
    this.passwordHasher = passwordHasher;
    this.jwtService = jwtService;
  }

  public LoginResult login(String username, String password) {
    SysUserEntity user = sysUserMapper.selectOne(
        new LambdaQueryWrapper<SysUserEntity>().eq(SysUserEntity::getUsername, username)
    );
    if (user == null) throw new UnauthorizedException("用户名或密码错误");
    if (!"ACTIVE".equals(user.getStatus())) throw new UnauthorizedException("账号已禁用");
    if (!passwordHasher.matches(password, user.getPasswordHash())) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    user.setLastLoginAt(LocalDateTime.now());
    sysUserMapper.updateById(user);

    JwtService.SignedToken signed = jwtService.issue(new AuthUser(user.getId(), user.getUsername(), java.util.Set.of(), java.util.Set.of(), null));
    return new LoginResult(user, signed);
  }

  public SysUserEntity requireUser(Long userId) {
    SysUserEntity user = sysUserMapper.selectById(userId);
    if (user == null) throw new UnauthorizedException("用户不存在");
    if (!"ACTIVE".equals(user.getStatus())) throw new UnauthorizedException("账号已禁用");
    return user;
  }

  public record LoginResult(SysUserEntity user, JwtService.SignedToken token) {}
}

