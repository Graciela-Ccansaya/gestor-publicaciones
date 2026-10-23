const API = 'https://jsonplaceholder.typicode.com';
const formBuscar     = document.querySelector('#form-buscar');
const formCrear      = document.querySelector('#form-crear');
const formComentar   = document.querySelector('#form-comentar');
const inputUsuario   = document.querySelector('#input-usuario');
const selectLimite   = document.querySelector('#select-limite');
const inputBusqueda  = document.querySelector('#input-busqueda');
const inputTitulo    = document.querySelector('#input-titulo');
const inputCuerpo    = document.querySelector('#input-cuerpo');
const errorTitulo    = document.querySelector('#error-titulo');
const errorCuerpo    = document.querySelector('#error-cuerpo');
const errorComentario = document.querySelector('#error-comentario');
const btnCrear       = document.querySelector('#btn-crear');
const btnComentar    = document.querySelector('#btn-comentar');
const estado         = document.querySelector('#estado');
const estadoComentario = document.querySelector('#estado-comentario');
const lista          = document.querySelector('#lista');

// Publicaciones cargadas en memoria (sirven para filtrar sin nuevas peticiones)
let publicaciones = [];

// 1. Petición genérica: sirve para GET y para POST
async function peticion(url, opciones = {}) {
    const res = await fetch(url, opciones);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    return { status: res.status, datos: await res.json() };
}

// 2. Funciones de interfaz
function crearTarjeta(post, esNuevo = false) {
    const art = document.createElement('article');
    art.className = esNuevo ? 'post nuevo' : 'post';
    art.dataset.id = post.id;
    const h3 = document.createElement('h3');
    h3.textContent = `#${post.id} ${post.title}`;
    const p = document.createElement('p');
    p.textContent = post.body;
    art.append(h3, p);
    return art;
}

function mostrarEstado(texto, esError = false) {
    estado.textContent = texto;
    estado.className = esError ? 'error' : '';
}

// Dibuja la lista aplicando el filtro de texto (Actividad 2)
function renderizarLista() {
    const texto = inputBusqueda.value.trim().toLowerCase();
    const filtradas = publicaciones.filter(p =>
        p.title.toLowerCase().includes(texto)
    );
    lista.replaceChildren(...filtradas.map(p => crearTarjeta(p, p.esNuevo)));
    if (filtradas.length === 0) {
        const vacio = document.createElement('p');
        vacio.textContent = 'No hay publicaciones que coincidan.';
        lista.append(vacio);
    }
}

// 3. GET: listar las publicaciones de un usuario
formBuscar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
        userId: inputUsuario.value,
        _limit: selectLimite.value
    });
    mostrarEstado('Cargando...');
    try {
        const { status, datos } = await peticion(`${API}/posts?${params}`);
        publicaciones = datos;
        renderizarLista();
        mostrarEstado(`GET ${status}: ${datos.length} publicaciones`);
    } catch (error) {
        mostrarEstado(error.message, true);
    }
});

// Filtro por título mientras se escribe (en el navegador, con filter)
inputBusqueda.addEventListener('input', renderizarLista);

// Clic en una publicación: GET a /posts/{id}/comments (Actividad 2)
lista.addEventListener('click', async (e) => {
    const art = e.target.closest('article.post');
    if (!art || e.target.closest('.comentarios')) return;

    // Si ya hay comentarios mostrados, se ocultan
    const existente = art.querySelector('.comentarios');
    if (existente) { existente.remove(); return; }

    const contenedor = document.createElement('div');
    contenedor.className = 'comentarios';
    contenedor.textContent = 'Cargando comentarios...';
    art.append(contenedor);

    try {
        const { status, datos } = await peticion(`${API}/posts/${art.dataset.id}/comments`);
        contenedor.replaceChildren();
        if (datos.length === 0) {
            contenedor.textContent = `GET ${status}: esta publicación no tiene comentarios.`;
            return;
        }
        const titulo = document.createElement('strong');
        titulo.textContent = `GET ${status}: ${datos.length} comentarios`;
        contenedor.append(titulo);
        datos.forEach(c => {
            const div = document.createElement('div');
            div.className = 'comentario';
            const autor = document.createElement('small');
            autor.textContent = `${c.name} (${c.email})`;
            const texto = document.createElement('p');
            texto.textContent = c.body;
            div.append(autor, texto);
            contenedor.append(div);
        });
    } catch (error) {
        contenedor.textContent = error.message;
        contenedor.className = 'comentarios error';
    }
});

// Validación del formulario de publicación (Actividad 3)
function validarPublicacion() {
    let valido = true;
    errorTitulo.textContent = '';
    errorCuerpo.textContent = '';
    if (inputTitulo.value.trim().length < 5) {
        errorTitulo.textContent = 'El título debe tener al menos 5 caracteres.';
        valido = false;
    }
    if (inputCuerpo.value.trim() === '') {
        errorCuerpo.textContent = 'El contenido no puede estar vacío.';
        valido = false;
    }
    return valido;
}

// 4. POST: crear una publicación
formCrear.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validarPublicacion()) return;     // no se envía si hay errores

    const nuevo = {
        title: inputTitulo.value.trim(),
        body: inputCuerpo.value.trim(),
        userId: Number(inputUsuario.value)
    };
    btnCrear.disabled = true;               // evita envíos duplicados
    mostrarEstado('Enviando...');
    try {
        const { status, datos } = await peticion(`${API}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevo)
        });
        publicaciones.unshift({ ...datos, esNuevo: true });
        renderizarLista();
        mostrarEstado(`POST ${status}: creada con id ${datos.id}`);
        formCrear.reset();
    } catch (error) {
        mostrarEstado(error.message, true);
    } finally {
        btnCrear.disabled = false;
    }
});

// 5. POST: comentar una publicación con FormData + Object.fromEntries (Actividad 3)
formComentar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datosForm = new FormData(formComentar);
    const objeto = Object.fromEntries(datosForm);
    objeto.postId = Number(objeto.postId);

    // Validación básica
    if (!objeto.name.trim() || !objeto.email.trim() || !objeto.body.trim()) {
        errorComentario.textContent = 'Complete nombre, correo y comentario.';
        return;
    }
    if (!/^\S+@\S+\.\S+$/.test(objeto.email)) {
        errorComentario.textContent = 'El correo no tiene un formato válido.';
        return;
    }
    errorComentario.textContent = '';

    btnComentar.disabled = true;
    estadoComentario.className = '';
    estadoComentario.textContent = 'Enviando comentario...';
    try {
        const { status, datos } = await peticion(`${API}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objeto)
        });
        estadoComentario.className = 'ok';
        estadoComentario.textContent = `POST ${status}: comentario creado con id ${datos.id}`;
        formComentar.reset();
    } catch (error) {
        estadoComentario.className = 'error';
        estadoComentario.textContent = error.message;
    } finally {
        btnComentar.disabled = false;
    }
});

// 6. Carga inicial
formBuscar.requestSubmit();
