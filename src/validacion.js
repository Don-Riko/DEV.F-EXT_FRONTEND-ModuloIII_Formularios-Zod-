// src/validacion.js
// -----------------------------------------------------------------------------
// LÓGICA DE VALIDACIÓN CON ZOD (separada del HTML)
// Define el esquema de registro con Zod, valida los datos en tiempo real y al
// enviar, y muestra mensajes de error claros por campo. Zod se carga por CDN
// (build UMD), por lo que está disponible como `window.Zod`.
// -----------------------------------------------------------------------------

// Importamos Zod desde el objeto global que expone el build UMD del CDN.
const { z } = window.Zod;

// --- Utilidades para validar el nombre de forma estricta ---------------------

// Palabras que representan números escritos (para rechazar "Cuatro", "dos mil 25").
const PALABRAS_NUMERO = [
  "cero", "uno", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete",
  "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince",
  "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte", "treinta",
  "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa",
  "cien", "ciento", "mil", "millon", "millones",
];

// Meses en español (para detectar fechas escritas como "18 de marzo").
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "setiembre", "octubre", "noviembre", "diciembre",
];

// Quita acentos y pasa a minúsculas para comparar.
const normaliza = (t) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ¿Alguna palabra del nombre es una palabra-número escrita?
const contienePalabraNumero = (nombre) =>
  nombre.split(/\s+/).some((p) => PALABRAS_NUMERO.includes(normaliza(p)));

// ¿El texto parece una fecha? (contiene un mes, o "de" entre tokens, o patrones dd/mm/aaaa)
const pareceFecha = (nombre) => {
  const norm = normaliza(nombre);
  if (MESES.some((m) => norm.includes(m))) return true; // "18 de marzo"
  if (/\b\d{1,4}\b/.test(nombre) && /\bde\b/.test(norm)) return true; // "20 de abril"
  if (/\d{1,2}[/\-.]\d{1,2}([/\-.]\d{2,4})?/.test(nombre)) return true; // 18/03/2025
  return false;
};

// Cada palabra empieza con mayúscula y el resto en minúscula (Capital Case).
const esCapitalCase = (nombre) =>
  nombre
    .split(/\s+/)
    .every((p) => /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(p));

// Esquema para validar los datos del formulario de registro.
const registerSchema = z.object({
  // El nombre: solo letras, Capital Case, mínimo 2 palabras (Nombre + Apellido),
  // sin números, sin palabras-número y sin fechas.
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .superRefine((valor, ctx) => {
      const v = valor.trim();
      const agregar = (message) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });

      // No se permiten dígitos.
      if (/\d/.test(v)) {
        agregar("El nombre no puede contener números ni fechas.");
        return;
      }
      // No se permiten fechas escritas (mes, "de", etc.).
      if (pareceFecha(v)) {
        agregar("El nombre no puede ser una fecha.");
        return;
      }
      // No se permiten palabras que representan números ("Cuatro", "dos mil").
      if (contienePalabraNumero(v)) {
        agregar("El nombre no puede contener números escritos con palabras.");
        return;
      }
      // Solo letras y espacios.
      if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(v)) {
        agregar("El nombre solo puede contener letras y espacios.");
        return;
      }
      // Al menos 2 palabras (Nombre + Apellido).
      const palabras = v.split(/\s+/).filter(Boolean);
      if (palabras.length < 2) {
        agregar("Escribe nombre y apellido (mínimo 2 palabras).");
        return;
      }
      // Capital Case en cada palabra.
      if (!esCapitalCase(v)) {
        agregar("Cada nombre y apellido debe iniciar con mayúscula (ej. Ana Pérez).");
      }
    }),

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

// Estima la "aleatoriedad" de la contraseña: proporción de caracteres únicos
// (una password con muchos caracteres distintos es menos predecible).
const esAleatoria = (pass) => {
  if (pass.length < 8) return false;
  const unicos = new Set(pass).size;
  const sinRepeticiones = !/(.)\1\1/.test(pass); // sin 3 iguales seguidos
  const sinSecuencia = !/(abc|bcd|cde|123|234|345|qwe|asd)/i.test(pass);
  return unicos / pass.length >= 0.7 && sinRepeticiones && sinSecuencia;
};

// Calcula y muestra la fuerza de la contraseña.
// Niveles: débil, media, fuerte y "super fuerte" (azul).
const actualizarFuerza = () => {
  const pass = inputPassword.value;
  const fuerzaLabel = document.getElementById("fuerzaLabel");

  // Reiniciamos clases.
  fuerzaBarra.className = "fuerza-barra";
  if (fuerzaLabel) fuerzaLabel.className = "fuerza-label";

  if (pass.length === 0) {
    if (fuerzaLabel) fuerzaLabel.textContent = "";
    return;
  }

  // Criterios individuales.
  const tieneMinus = /[a-z]/.test(pass);
  const tieneMayus = /[A-Z]/.test(pass);
  const tieneNumero = /\d/.test(pass);
  const tieneEspecial = /[^A-Za-z0-9]/.test(pass);
  const larga = pass.length >= 12;

  let puntos = 0;
  if (pass.length >= 6) puntos++;
  if (tieneMinus && tieneMayus) puntos++;
  if (tieneNumero) puntos++;
  if (tieneEspecial) puntos++;

  // "Super fuerte": cumple TODOS los criterios + longitud + aleatoriedad.
  const superFuerte =
    larga &&
    tieneMinus &&
    tieneMayus &&
    tieneNumero &&
    tieneEspecial &&
    esAleatoria(pass);

  let nivel;
  if (superFuerte) nivel = "superfuerte";
  else if (puntos >= 4) nivel = "fuerte";
  else if (puntos >= 2) nivel = "media";
  else nivel = "debil";

  fuerzaBarra.classList.add(nivel);
  if (fuerzaLabel) {
    const textos = {
      debil: "Débil",
      media: "Media",
      fuerte: "Fuerte",
      superfuerte: "💪 Súper fuerte",
    };
    fuerzaLabel.classList.add(nivel);
    fuerzaLabel.textContent = textos[nivel];
  }
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
  const fuerzaLabel = document.getElementById("fuerzaLabel");
  if (fuerzaLabel) {
    fuerzaLabel.className = "fuerza-label";
    fuerzaLabel.textContent = "";
  }
  CAMPOS.forEach((campo) => {
    const contenedor = document.getElementById(`error-${campo}`)?.closest(".campo");
    contenedor?.classList.remove("valido", "invalido");
  });
});
