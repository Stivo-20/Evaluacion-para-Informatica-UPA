document.addEventListener('DOMContentLoaded', () => {
    console.log('Script cargado y listo.');
    const titulo = document.getElementById('titulo-bienvenida');

    const nombreUsuario = "Estudiante"; 

    if (titulo && nombreUsuario) {
        titulo.textContent = `¡Bienvenido, ${nombreUsuario}!`;
    }
});

// -------------------------------- Script Formulario --------------------------------  
document.addEventListener('DOMContentLoaded', () => {
const form = document.getElementById('userForm');
const nombreInput = document.getElementById('usuario');
const emailInput = document.getElementById('email');
const edadSpan = document.getElementById('edad');
const telefonoInput = document.getElementById('telefono');
const fechaInput = document.getElementById('fecha');

const errorusuario = document.getElementById('error-usuario');
const errorFecha = document.getElementById('error-fecha');
const errorTelefono = document.getElementById('error-telefono');
const errorEmail = document.getElementById('error-email');

const nombreRegex = /^[a-zA-Z\s]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telefonoRegex = /^[0-9]+$/;
const fechaRegex = /^(\d{2}-\d{2}-\d{4})$/; 

fechaInput.addEventListener('input', () => {
    const fechastring = fechaInput.value;

    if (!fechaRegex.test(fechastring)) {
        edadSpan.textContent = '0';
        return;
    }

    const [dia, mes, anio] = fechastring.split('-').map(Number);
    const fechaNacimiento = new Date(+anio, +mes - 1, +dia);

    if(isNaN(fechaNacimiento.getTime())|| fechaNacimiento.getDate() !== +dia) {
        edadSpan.textContent = '0';
        return;
    }
        

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
    const m = hoy.getMonth() - fechaNacimiento.getMonth();


    if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
    }
    edadSpan.textContent = edad >= 0 ? edad : '0';
});
function mostrarError(input, span, mensaje) {
        input.classList.add('invalido'); 
        span.textContent = mensaje;
        span.style.display = 'block';
    }

    function ocultarError(input, span) {
        input.classList.remove('invalido');
        span.textContent = '';
        span.style.display = 'none';
    }

    function validarFormulario() {
        let esValido = true; 

        const nombre = nombreInput.value.trim();
        const fecha = fechaInput.value.trim();
        const telefono = telefonoInput.value.trim();
        const email = emailInput.value.trim();

        if (nombre === '' || !nombreRegex.test(nombre)) {
            mostrarError(nombreInput, errorusuario, 'El nombre solo debe contener letras y espacios.');
            esValido = false;
        } else {
            ocultarError(nombreInput, errorusuario);
        }

        if (fecha === '' || !fechaRegex.test(fecha) || edadSpan.textContent === '0') {
             mostrarError(fechaInput, errorFecha, 'El formato debe ser dd-mm-YYYY y ser una fecha válida.');
             esValido = false;
        } else {
            ocultarError(fechaInput, errorFecha);
        }

        if (telefono === '' || !telefonoRegex.test(telefono)) {
            mostrarError(telefonoInput, errorTelefono, 'El teléfono solo debe contener números.');
            esValido = false;
        } else {
            ocultarError(telefonoInput, errorTelefono);
        }

        if (email === '' || !emailRegex.test(email)) {
            mostrarError(emailInput, errorEmail, 'Ingresa un formato de correo válido (ej: correo@dominio.com).');
            esValido = false;
        } else {
            ocultarError(emailInput, errorEmail);
        }

        return esValido;
    }

    form.addEventListener('submit', (evento) => {
        evento.preventDefault(); 
        
        console.log("Validando formulario...");
        
        if (validarFormulario()) {
            console.log("¡Validación exitosa! Enviando al servidor...");
            
            enviarDatosAlServidor();
        } else {
            console.log("Validación fallida. Revisa los campos.");
        }
    });

    async function enviarDatosAlServidor() {
        const btnEnviar = document.getElementById('btn-enviar');
        const mensajeExito = document.getElementById('mensaje-exito');
        const mensajeErrorGlobal = document.getElementById('error-global') || 
                                   document.createElement('span'); 
        
        if (!document.getElementById('error-global')) {
            mensajeErrorGlobal.id = 'error-global';
            mensajeErrorGlobal.classList.add('error-texto');
            btnEnviar.parentNode.insertBefore(mensajeErrorGlobal, btnEnviar);
        }

        mensajeExito.style.display = 'none'; 
        mensajeErrorGlobal.style.display = 'none';

        btnEnviar.disabled = true;
        btnEnviar.textContent = 'Enviando...';

        const datos = {
            nombre: nombreInput.value.trim(),
            fechaNacimiento: fechaInput.value.trim(),
            telefono: telefonoInput.value.trim(),
            email: emailInput.value.trim()
        };

        try {
            const respuesta = await fetch('http://localhost:3000/guardar_usuario', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos) 
            });

            const resultado = await respuesta.json();

            if (respuesta.ok) { 
                mensajeExito.textContent = `¡Registro exitoso! ID de usuario: ${resultado.idUsuario}`;
                mensajeExito.style.display = 'block';
                form.reset(); 
                edadSpan.textContent = '0'; 
                
            } else if (respuesta.status === 403) { 
                mensajeErrorGlobal.textContent = resultado.detalle;
                mensajeErrorGlobal.style.display = 'block';
                mensajeErrorGlobal.style.color = 'red';

            } else {
                mensajeErrorGlobal.textContent = `Error: ${resultado.error}. Detalle: ${resultado.detalle || 'Consulte la consola.'}`;
                mensajeErrorGlobal.style.display = 'block';
                mensajeErrorGlobal.style.color = 'red';
            }

        } catch (error) {
            console.error('Error de red con fetch:', error);
            mensajeErrorGlobal.textContent = 'Error de conexión. No se pudo contactar al servidor.';
            mensajeErrorGlobal.style.display = 'block';
            mensajeErrorGlobal.style.color = 'red';
        } finally {
            btnEnviar.disabled = false;
            btnEnviar.textContent = 'Enviar Datos';
        }
}
});