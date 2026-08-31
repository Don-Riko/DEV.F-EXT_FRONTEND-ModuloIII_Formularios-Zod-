# 🛡️ Registro de Usuario — Validación de Formularios con Zod

Proyecto del **Módulo III (Frontend)** de DEV.F. Es un **formulario de registro** (nombre, correo y
contraseña) cuyos datos se validan con la biblioteca **[Zod](https://zod.dev/)** antes de "enviarse".
Muestra **mensajes de error claros por campo** y valida **en tiempo real** para mejorar la
experiencia del usuario.

El código parte del [gist de ejemplo del sensei](https://gist.github.com/heladio-devf-mx/d346481f3833ae89d9c1628832438578).

## 🌐 Demo en vivo (GitHub Pages)

👉 **https://don-riko.github.io/DEV.F-EXT_FRONTEND-ModuloIII_Formularios-Zod-/**

> Si aún no carga, hay que habilitar Pages en **Settings → Pages → Source = GitHub Actions** (ver nota al final).

## 🧩 El problema

Un formulario de registro que solicita:

- **Nombre** (texto, no vacío)
- **Correo electrónico** (formato válido)
- **Contraseña** (al menos 6 caracteres)

Los datos se validan con **Zod** al enviar; si algo falla, se muestran mensajes de error claros.

## 📂 Estructura del proyecto

```
.
├── index.html              # Estructura del formulario (Zod por CDN, enlaza CSS y JS)
├── styles.css              # Estilos SEPARADOS del HTML
├── src/
│   └── validacion.js       # Esquema de Zod + validación en tiempo real y en submit
└── .github/workflows/      # Workflow de despliegue a GitHub Pages
```

## 🛡️ Esquema de validación con Zod

```js
const registerSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio."),
  email: z.string().email("Ingresa un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});
```

Se usa `registerSchema.safeParse(formData)` para validar sin lanzar excepciones, y los errores se
mapean a cada campo.

## ✨ Extras añadidos

- **Validación en tiempo real** (al escribir/salir de cada campo), no solo al enviar.
- Mensajes de error **por campo** (debajo de cada input) además del resumen general.
- **Medidor de fuerza** de la contraseña y regla extra (una letra y un número).
- Botón para **mostrar/ocultar** la contraseña y mensaje de éxito con resumen.

## 🚀 Cómo usar

Abre `index.html` (o visita la demo en GitHub Pages), completa el formulario y pulsa **"Registrar"**.
Los errores se marcan por campo; si todo es válido, verás el mensaje de éxito.

## ⚙️ Nota sobre GitHub Pages

Este repositorio incluye un workflow que despliega el sitio automáticamente. Para activarlo la
primera vez: **Settings → Pages → Source → GitHub Actions**, y luego re-ejecuta el workflow
*"Deploy to GitHub Pages"* desde la pestaña **Actions**.

## 📜 Licencia

MIT
