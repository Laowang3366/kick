package com.excel.forum.entity.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private UserDTO user;

    @Data
    @AllArgsConstructor
    public static class UserDTO {
        private Long id;
        private String username;
        private String email;
        private String avatar;
        private String role;
        private Integer level;
        private Integer points;
        private Integer exp;
        private String bio;
        private String expertise;
        private String gender;
        private String jobTitle;
        private String location;
        private String website;
        private String coverImage;
        private Boolean notificationEmailEnabled;
        private Boolean notificationPushEnabled;
        private String themePreference;
    }
}
