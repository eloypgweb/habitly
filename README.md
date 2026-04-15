# Habitly

Habitly es un planner de habitos y estudio hecho con Astro.

Permite:
- Gestionar tareas por dia, semana y mes.
- Vincular tareas a objetivos.
- Marcar bloques horarios completados.
- Guardar perfil basico (nombre y avatar).
- Login con correo o usuario + contrasena.
- Registro con correo, usuario, contrasena y confirmacion.
- Persistir datos en localStorage y sincronizar en Supabase por usuario.

## Requisitos

- Node.js 22 o superior.
- npm.
- Proyecto de Supabase.

## Comandos

Todos los comandos se ejecutan desde la raiz del proyecto:

| Command | Action |
| :-- | :-- |
| `npm install` | Instala dependencias |
| `npm run dev` | Inicia entorno local en `localhost:4321` |
| `npm run build` | Genera build de produccion |
| `npm run preview` | Sirve el build local |

## Auth y persistencia

Habitly usa una estrategia hibrida:
- Siempre guarda en localStorage.
- Si hay sesion de usuario en Supabase, sincroniza el estado remoto automaticamente.

El acceso a la app principal requiere iniciar sesion en `/login` o crear cuenta en `/register`.

## Configuracion Supabase

1. Copia `.env.example` a `.env`.
2. Rellena estas variables:
	 - `PUBLIC_SUPABASE_URL`
	 - `PUBLIC_SUPABASE_ANON_KEY`
3. En Supabase > Authentication > Providers habilita `Email`.
4. En Supabase > Authentication > Sign In / Providers configura si quieres exigir confirmacion de email.
5. Ejecuta el SQL de `supabase/schema.sql` en el SQL Editor.

Con eso, cada usuario autenticado tendra:
- Estado sincronizado en `user_states`.
- Perfil de login en `profiles`.
- Funciones RPC para login por usuario (`get_login_email`) y validacion de disponibilidad (`is_username_available`).

## Deploy en Vercel

1. En Vercel, abre tu proyecto y entra en `Settings > Environment Variables`.
2. Crea las variables:
	 - `PUBLIC_SUPABASE_URL`
	 - `PUBLIC_SUPABASE_ANON_KEY`
3. Asignalas a `Production` (y recomendado tambien `Preview` y `Development`).
4. Haz redeploy del proyecto.
5. En Supabase > Authentication > URL Configuration, agrega la URL de Vercel en `Site URL`.

## Estructura relevante

```text
src/
	components/      # Vistas Astro
	scripts/app.js   # Logica de UI y eventos
	scripts/auth.js  # Login y registro
	styles/app.css   # Estilos globales
	styles/auth.css  # UI de login/registro
	utils/storage.js # Persistencia local + sync
	utils/supabase.js
supabase/
	schema.sql       # Tabla y politicas RLS
```

## Notas tecnicas

- El estado se guarda como JSON en `user_states.payload`.
- La clave de localStorage actual es `habitly_state_v2`.
- Se incluye normalizacion de datos para compatibilidad con formatos anteriores.
