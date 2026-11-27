# Salud Directa — App Móvil (React Native + Expo)

Aplicación móvil para **pacientes sin cobertura médica** correspondiente al TFI **Salud Directa (UTN-FRRe)**, desarrollada con **Expo SDK 54**, **React Navigation 7**, **SecureStore** y estándares **WCAG 2.1 Nivel AA**.

---

## Funcionalidades implementadas (Portal Paciente)
- **HU1 — Registro, Login y Consentimiento Informado (Ley 25.326):** sesión persistida con `expo-secure-store` en iOS/Android y manejo de respuestas `429` / `ProblemDetails`.
- **HU4 y HU5 — Perfil Profesional, Honorarios Obligatorios y Paquetes:** ficha pública con matrícula verificada SISA/REFEPS, accesibilidad edilicia detallada y planes de múltiples sesiones.
- **HU6 — Buscador con Filtros Combinables y Comparativa:** filtro combinado por profesión, localidad, tope de honorarios, franja horaria, rampa/ascensor/baño adaptado y verificados SISA, más comparador lateral de hasta 3 profesionales.
- **HU7 — Orientación Asistida por IA:** consulta en lenguaje natural con advertencia visible permanente (*"No constituye un diagnóstico médico"*), detección prioritaria de urgencias (`107` SAME / `911` / `0800-345-1435`) y degradación resiliente.
- **HU8, HU9, HU10 y HU11 — Reserva, Turnos, Recordatorios y Mercado Pago:** control de superposición horaria, pago total o seña (30%), política de cancelación 24 hs y comprobante oficial compartible.
- **HU12 — Seguimiento de Paquetes:** barra de progreso accesible, contadores de sesiones y bloqueo estricto de exceso de reservas.
- **HU14 — Privacidad y Cuenta:** Derecho de Acceso (`GET /api/cuenta/me/datos`) con copia JSON compartible y Derecho de Supresión (`DELETE /api/cuenta/me`).

---

## Puesta en marcha

1. Copiá `mobile/.env.example` a `mobile/.env` y configurá la URL del backend .NET 8 según dónde ejecutes la app:
   - **Emulador Android:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api`
   - **Simulador iOS / Expo Web:** `EXPO_PUBLIC_API_URL=http://localhost:5000/api`
   - **Celular físico con Expo Go (misma red Wi-Fi):** `EXPO_PUBLIC_API_URL=http://<TU_IP_LOCAL>:5000/api`

2. Ejecutá desde la carpeta `mobile/`:

```bash
cd mobile

# Abrir QR para Expo Go (Android / iOS)
npx expo start

# Probar directamente en navegador web
npx expo start --web
```
