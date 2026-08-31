// src/validacion.js
// -----------------------------------------------------------------------------
// LÓGICA DE VALIDACIÓN CON ZOD (separada del HTML)
// Define el esquema de registro con Zod, valida los datos en tiempo real y al
// enviar, y muestra mensajes de error claros por campo. Zod se carga por CDN
// (build UMD), por lo que está disponible como `window.Zod`.
// -----------------------------------------------------------------------------

// Importamos Zod desde el objeto global que expone el build UMD del CDN.
const { z } = window.Zod;

// Esquema para validar los datos del formulario de registro.
const registerSchema = z.object({
  // El nombre debe ser una cadena no vacía (mínimo 2 caracteres).
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .min(2, "El nombre debe tener al menos 2 caracteres."),

  // El correo debe tener el formato correcto.
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio.")
    .email("Ingresa un correo electrónico válido (ej. nombre@dominio.com)."),

  // La contraseña debe tener al menos 6 caracteres (regla base del proyecto)
  // y, como extra, incluir al menos una letra y un número.
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres.")
    .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
    .regex(/\d/, "La contraseña debe incluir al menos un número."),
});

// Referencias al DOM.
const form = document.getElementById("registerForm");
const erroresGeneral = document.getElementById("errors");
const resultado = document.getElementById("resultado");
const fuerzaBarra = document.getElementById("fuerzaBarra");
const togglePass = document.getElementById("togglePass");
const inputPassword = document.getElementById("password");

const CAMPOS = ["name", "email", "password"];

// Recolecta los valores actuales del formulario.
const obtenerDatos = () => ({
  name: form.name.value,
  email: form.email.value,
  password: form.password.value,
});

// Muestra u oculta el error de un campo y marca su estado (válido/ inválido).
const pintarError = (campo, mensaje = "") => {
  const errorEl = document.getElementById(`error-${campo}`);
  const contenedor = errorEl?.closest(".campo");
  if (errorEl) errorEl.textContent = mensaje;
  if (contenedor) {
    contenedor.classList.toggle("invalido", Boolean(mensaje));
    // "válido" solo si el campo tiene contenido y no hay error.
    const tieneValor = form[campo].value.trim() !== "";
    contenedor.classList.toggle("valido", !mensaje && tieneValor);
  }
};

// Valida con Zod y devuelve un mapa { campo: mensaje }.
const obtenerErrores = () => {
  const res = registerSchema.safeParse(obtenerDatos());
  if (res.success) return { ok: true, errores: {}, data: res.data };

  const errores = {};
  for (const issue of res.error.issues) {
    const campo = issue.path[0];
    if (campo && !errores[campo]) errores[campo] = issue.message;
  }
  return { ok: false, errores };
};

// Valida todos los campos y los pinta. Devuelve el resultado.
const validarTodo = () => {
  const res = obtenerErrores();
  CAMPOS.forEach((campo) => pintarError(campo, res.errores[campo] ?? ""));
  return res;
};

// Valida un solo campo (para la validación en tiempo real).
const validarCampo = (campo) => {
  const res = obtenerErrores();
  pintarError(campo, res.errores[campo] ?? "");
};

// Calcula y muestra la fuerza de la contraseña (extra).
const actualizarFuerza = () => {
  const pass = inputPassword.value;
  let puntos = 0;
  if (pass.length >= 6) puntos++;
  if (/[A-Za-z]/.test(pass) && /\d/.test(pass)) puntos++;
  if (pass.length >= 10 || /[^A-Za-z0-9]/.test(pass)) puntos++;

  fuerzaBarra.className = "fuerza-barra";
  if (pass.length === 0) return;
  if (puntos <= 1) fuerzaBarra.classList.add("debil");
  else if (puntos === 2) fuerzaBarra.classList.add("media");
  else fuerzaBarra.classList.add("fuerte");
};

// Validación en tiempo real: al escribir (input) en cada campo.
CAMPOS.forEach((campo) => {
  form[campo].addEventListener("input", () => {
    validarCampo(campo);
    if (campo === "password") actualizarFuerza();
    // Limpiamos el resumen general mientras el usuario corrige.
    erroresGeneral.textContent = "";
  });
});

// Mostrar / ocultar contraseña.
togglePass.addEventListener("click", () => {
  const oculto = inputPassword.type === "password";
  inputPassword.type = oculto ? "text" : "password";
  togglePass.textContent = oculto ? "🙈" : "👁️";
});

// Manejo del envío.
form.addEventListener("submit", (event) => {
  event.preventDefault();
  resultado.className = "resultado";
  resultado.textContent = "";
  erroresGeneral.textContent = "";

  const res = validarTodo();

  if (!res.ok) {
    // Resumen general con todos los mensajes (como en el gist original).
    erroresGeneral.textContent = Object.values(res.errores).join(" · ");
    const primerError = form.querySelector(".campo.invalido input");
    if (primerError) primerError.focus();
    return;
  }

  // Datos válidos (y saneados por Zod).
  const { name, email } = res.data;
  resultado.className = "resultado ok";
  resultado.innerHTML = `
    <strong>✅ ¡Registro exitoso!</strong>
    <ul>
      <li><strong>Nombre:</strong> ${name}</li>
      <li><strong>Correo:</strong> ${email}</li>
      <li><strong>Contraseña:</strong> ••••••••</li>
    </ul>`;

  form.reset();
  fuerzaBarra.className = "fuerza-barra";
  CAMPOS.forEach((campo) => {
    const contenedor = document.getElementById(`error-${campo}`)?.closest(".campo");
    contenedor?.classList.remove("valido", "invalido");
  });
});
