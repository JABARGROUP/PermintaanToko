(function() {
    'use strict';
    
    // URL Target Aplikasi
    var URL_HP = 'https://polytasik-pixel.github.io/permintaanToko/';
    var URL_PC = 'https://polytasik-pixel.github.io/permintaanTokoo/';

    /**
     * Ekstrak dan Parse SSO JWT dari Supabase (Query & Hash)
     * Supabase SSO biasanya mengirim token via URL Hash (#access_token=...) atau Query (?sso_jwt=... / ?access_token=...)
     */
    function parseSupabaseSsoJwt() {
        var params = {};

        // 1. Parse dari URL Query String (?key=value)
        if (window.location.search) {
            try {
                var searchParams = new URLSearchParams(window.location.search);
                searchParams.forEach(function(value, key) {
                    params[key] = value;
                });
            } catch(e) {}
        }

        // 2. Parse dari URL Hash Fragment (#key=value) - Standard Supabase Auth SSO
        if (window.location.hash) {
            try {
                var hashStr = window.location.hash.substring(1);
                var hashParams = new URLSearchParams(hashStr);
                hashParams.forEach(function(value, key) {
                    params[key] = value;
                });
            } catch(e) {}
        }

        // 3. Deteksi Token JWT (access_token, sso_jwt, jwt, token, provider_token)
        var accessToken = params.access_token || params.sso_jwt || params.jwt || params.token || '';
        var refreshToken = params.refresh_token || '';
        var tokenType = params.token_type || 'bearer';
        var parsedPayload = null;

        if (accessToken) {
            try {
                // Decode bagian Payload dari JWT (Bagian kedua dari token format header.payload.signature)
                var parts = accessToken.split('.');
                if (parts.length === 3) {
                    var base64Url = parts[1];
                    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    }).join(''));
                    parsedPayload = JSON.parse(jsonPayload);
                }
            } catch(e) {
                console.warn('[SSO JWT REDIRECTOR]: Gagal melakukan decode payload JWT:', e);
            }

            // Simpan token & payload sementara di sessionStorage / localStorage untuk aplikasi tujuan
            try {
                if (parsedPayload) {
                    sessionStorage.setItem('SUPABASE_SSO_JWT', accessToken);
                    sessionStorage.setItem('SUPABASE_SSO_PAYLOAD', JSON.stringify(parsedPayload));
                    if (refreshToken) sessionStorage.setItem('SUPABASE_SSO_REFRESH_TOKEN', refreshToken);
                    
                    localStorage.setItem('SUPABASE_SSO_JWT_LAST', accessToken);
                }
            } catch(e) {}
        }

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenType: tokenType,
            payload: parsedPayload,
            rawParams: params
        };
    }

    // Ekstrak SSO JWT jika ada
    var ssoData = parseSupabaseSsoJwt();

    // Deteksi Tipe Perangkat (HP / Mobile vs Laptop / PC)
    var ua = navigator.userAgent || navigator.vendor || window.opera;
    var isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua) ||
                   (window.innerWidth <= 768) ||
                   (/Macintosh/i.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

    // Tentukan URL dasar tujuan
    var baseUrl = isMobile ? URL_HP : URL_PC;

    // Pertahankan seluruh parameter Query & Hash (termasuk Supabase SSO JWT access_token/refresh_token)
    var searchStr = window.location.search || '';
    var hashStr = window.location.hash || '';

    // URL Final untuk pengalihan (Auto-Redirect)
    var finalUrl = baseUrl + searchStr + hashStr;

    // Jalankan pengalihan
    window.location.replace(finalUrl);
})();
