const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const mysql = require('mysql2/promise');
const path = require('path'); // Módulo para manejar rutas de archivos
const app = express();
const port = 3000; 

app.use(cors({origin: 'http://localhost:3000'}));

app.use(helmet());

app.use(express.json({ limit: '10kb' }));

app.use(express.static(path.join(__dirname, '..','front'))); 

const DB_NAME = 'evaluacion_luis_steve_diaz_fuentes'; 
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'admin123', 
    database: DB_NAME, 
};

let pool; 

async function connectDB() {
    let connection;
    try {
        pool = mysql.createPool(dbConfig);
        console.log(` Conexión a la base de datos '${DB_NAME}' establecida.`);
        connection = await pool.getConnection();
        connection.release();
    } catch (error) {
        console.error(" Error al conectar con MySQL:", error.message);
        process.exit(1); 
    }
}



function convertirFecha(fechaStr) {
    const regexFecha = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = fechaStr.match(regexFecha);
    if (!match) return null; 
    return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * @returns {number} 
 */
function calcularEdad(fechaStr) {
    const regexFecha = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = fechaStr.match(regexFecha);
    if (!match) return null;

    const anio = +match[3], mes = +match[2], dia = +match[1];
    const fechaNacObj = new Date(anio, mes - 1, dia);

    if (isNaN(fechaNacObj.getTime()) || fechaNacObj.getDate() !== dia) return null;

    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNacObj.getFullYear();
    const m = hoy.getMonth() - fechaNacObj.getMonth();

    if (m < 0 || (m === 0 && hoy.getDate() < fechaNacObj.getDate())) {
        edad--;
    }

    return edad >= 0 ? edad : 0;
}


app.post('/guardar_usuario', async (req, res) => {
    
    const { nombre, fechaNacimiento, telefono, email } = req.body;
    
    if (!nombre || !fechaNacimiento || !telefono || !email) {
        return res.status(400).json({ 
            error: "Faltan campos obligatorios.", 
            detalle: "Por favor, complete todos los campos."
        });
    }

    const nombreRegex = /^[a-zA-Z\s]+$/;
    const telefonoRegex = /^[0-9]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const fechaRegex = /^\d{2}-\d{2}-\d{4}$/; 
    
    if (!nombreRegex.test(nombre)) return res.status(400).json({ error: "Nombre inválido (solo letras)." });
    if (!telefonoRegex.test(telefono)) return res.status(400).json({ error: "Teléfono inválido (solo números)." });
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Correo inválido." });
    if (!fechaRegex.test(fechaNacimiento)) return res.status(400).json({ error: "Fecha inválida (formato dd-mm-YYYY)." });

    const edad = calcularEdad(fechaNacimiento);
    if (edad === null || edad < 18) {
        return res.status(403).json({ 
            error: "Acceso denegado.", 
            detalle: "El usuario debe ser mayor de 18 años para registrarse.",
            edadCalculada: edad
        });
    }

    const fechaMySQL = convertirFecha(fechaNacimiento);
    
    const EstadoUsuarioId = 1; 

    const query = `
        INSERT INTO USUARIO (NOMBRE, FECHA, TELEFONO, CORREO, ESTADO_USUARIO_ID)
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        const [resultado] = await pool.execute(query, [nombre, fechaMySQL, telefono, email, EstadoUsuarioId]);

        console.log(`Usuario ID ${resultado.insertId} registrado exitosamente.`);

        res.status(201).json({ 
            mensaje: "Usuario registrado con éxito.", 
            idUsuario: resultado.insertId 
        });

    } catch (error) {
        console.error("Error al insertar en la DB:", error);
        
        if (error.errno === 1062) {
            return res.status(409).json({ 
                error: "El correo electrónico ya está registrado.",
                campo: "email"
            });
        }
        
        res.status(500).json({ 
            error: "Error interno del servidor al procesar la solicitud.", 
            detalle: error.message
        });
    }
});

function obtenerFechaMySQL(diasAtras = 0) {
    const ahora = new Date();
    ahora.setDate(ahora.getDate() - diasAtras); 
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

/**
 * @returns {Promise<Array<Object>>}
 */
async function reporteUsuariosCreadosHoy() {
    const fechaHoy = obtenerFechaMySQL(0);
    const query = `
        SELECT u.ID, u.NOMBRE, u.TELEFONO, u.CORREO, eu.TITULO AS ESTADO 
            FROM USUARIO u 
            JOIN  ESTADO_USUARIO eu ON u.ESTADO_USUARIO_ID = eu.ID 
            WHERE DATE(u.CREACION) = ? 
            ORDER BY u.CREACION DESC;`
    const [rows] = await pool.execute(query, [fechaHoy]);
    return rows;
}

/**
 * @returns {Promise<Array<Object>>}
 */
async function reporteUsuariosCreadosAyer() {
    const fechaAyer = obtenerFechaMySQL(1);
    const query = `
        SELECT u.ID, u.NOMBRE, u.TELEFONO, u.CORREO, eu.TITULO AS ESTADO 
            FROM USUARIO u 
            JOIN  ESTADO_USUARIO eu ON u.ESTADO_USUARIO_ID = eu.ID 
            WHERE DATE(u.CREACION) = ? 
            ORDER BY u.CREACION DESC;`
    const [rows] = await pool.execute(query, [fechaAyer]);
    return rows;
}

async function reporteUsuariosUltimos() {
    const query = `
        SELECT u.ID, u.NOMBRE, u.TELEFONO, u.CORREO, eu.titulo AS ESTADO 
            FROM USUARIO u
            JOIN ESTADO_USUARIO eu ON u.ESTADO_USUARIO_ID = eu.id
            ORDER BY u.NOMBRE ASC`
    ;
    const [rows] = await pool.execute(query);
    return rows;
}


/** 
*@returns {Promise<Array<Object>>}
*/

async function reporteListadoUsuarios() {
    
    const query = `
        SELECT ID, NOMBRE, TELEFONO, CORREO 
        FROM USUARIO
        ORDER BY ID ASC
    `;
    const [rows] = await pool.execute(query);
    return rows;
}

/**
 * @returns {Promise<Array<Object>>}
 */

async function reporteConteoPorEstados() {
    const query = `
        SELECT EU.TITULO AS estado, COUNT(U.ID) AS conteo
        FROM ESTADO_USUARIO EU
        JOIN USUARIO U ON EU.ID = U.ESTADO_USUARIO_ID
        GROUP BY EU.TITULO
        ORDER BY conteo DESC
    `;
    const [rows] = await pool.execute(query);
    return rows;
}

const ReporteMapper = {
    'listado_usuarios': reporteListadoUsuarios,
    'conteo_estados': reporteConteoPorEstados,
    'creados_hoy': reporteUsuariosCreadosHoy,
    'creados_ayer': reporteUsuariosCreadosAyer,
    'usuarios_ultimos': reporteUsuariosUltimos
};


app.get('/ejecutar_reporte/:reporte', async (req, res) => {
    const reporteCodigo = req.params.reporte;
    const funcionReporte = ReporteMapper[reporteCodigo];

    if (!funcionReporte) {
        console.error(`Error 500: Codigo de reporte no encontrado: ${reporteCodigo}`);
        return res.status(500).json({ 
            error: "Error inesperado",
            detalle: `Código de reporte no encontrado: '${reporteCodigo}' no es valido`,
            codigo: reporteCodigo
    });
}try {
        const datosReporte = await funcionReporte();
        res.status(200).json({ 
            mensaje: "Reporte ejecutado con éxito.",
            reporte: reporteCodigo, 
            data: datosReporte });
    } catch (error) {
        console.error(`Error al ejecutar el reporte '${reporteCodigo}':`, error);
        res.status(500).json({
            error: "Error al ejecutar el reporte.",
            detalle: "Ocurrio un error al procesar la logica del reporte.",
            mensajeTecnico: error.message
        });
    }
});

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`✨ Backend iniciado. Servidor Node.js escuchando en http://localhost:${port}`);
    });
});