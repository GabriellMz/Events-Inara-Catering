const supabaseUrl = 'https://kkkonlfsmdvquuhrresu.supabase.co';
const supabaseKey = 'sb_publishable_S9LKSwIG3iOTXxHQc9J4rg_7Ok8-zcv';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. MANEJO DE SESIÓN Y PROTECCIÓN DE RUTAS
    // ==========================================
    const { data: { session } } = await supabaseClient.auth.getSession();
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    let profile = null;
    if (session) {
        const { data } = await supabaseClient
            .from('perfiles')
            .select('nombre_completo, rol')
            .eq('id', session.user.id)
            .single();
        profile = data;
    }

    if (session && profile) {
        if (currentPage === 'login.html') {
            window.location.href = profile.rol === 'admin' ? 'dashboard.html' : 'index.html';
            return;
        }
        if (currentPage === 'dashboard.html' && profile.rol !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    } else {
        if (currentPage === 'dashboard.html') {
            window.location.href = 'login.html';
            return;
        }
    }

    const authContainers = document.querySelectorAll('.auth-container');
    authContainers.forEach(container => {
        if (session && profile) {
            const primerNombre = profile.nombre_completo ? profile.nombre_completo.split(' ')[0] : 'Usuario';
            container.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="text-accent fw-bold" style="font-size: 0.9rem;">Hola, ${primerNombre}</span>
                    <button class="nav-icon-btn btn-logout" title="Cerrar Sesión" style="background: none; border: none; padding: 0;">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            `;
        }
    });

    document.addEventListener('click', async (e) => {
        const logoutBtn = e.target.closest('.btn-logout');
        if (logoutBtn) {
            e.preventDefault(); 
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html'; 
        }
    });

    // ==========================================
    // 2. FORMULARIOS DE AUTENTICACIÓN
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = document.getElementById('loginPassword').value;

            const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
                email, password
            });

            if (authError) {
                alert('Credenciales incorrectas o usuario no encontrado.');
                return;
            }

            const { data: currentProfile } = await supabaseClient
                .from('perfiles')
                .select('rol')
                .eq('id', authData.user.id)
                .single();

            window.location.href = (currentProfile && currentProfile.rol === 'admin') ? 'dashboard.html' : 'index.html';
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('regNombre').value;
            const email = document.getElementById('regEmail').value;
            const telefono = document.getElementById('regTelefono').value;
            const password = document.getElementById('registerPassword').value;

            const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

            if (authError) {
                alert('Error al crear la cuenta: ' + (authError.message.includes('already registered') ? 'El correo ya está registrado.' : authError.message));
                return;
            }

            if (authData.user) {
                const { error: insertError } = await supabaseClient.from('perfiles').insert([
                    { id: authData.user.id, nombre_completo: nombre, telefono: telefono, rol: 'cliente' }
                ]);

                if (insertError) alert('Hubo un error al guardar el perfil: ' + insertError.message);
                else {
                    await supabaseClient.auth.signOut();
                    alert('¡Cuenta creada exitosamente! Ya puedes iniciar sesión con tus credenciales.');
                    document.getElementById('btnSwitchToLogin').click();
                    registerForm.reset();
                }
            }
        });
    }

    // ==========================================
    // 3. ENVÍO DE RESERVAS (CONTACTO)
    // ==========================================
    const formContacto = document.getElementById('formContacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombreInput') ? document.getElementById('nombreInput').value : 'Cliente';
            const correo = document.getElementById('correoInput') ? document.getElementById('correoInput').value : '';
            const telefono = document.getElementById('telefonoInput') ? document.getElementById('telefonoInput').value : '';
            const selectEvento = document.getElementById('tipoEvento');
            const tipoEvento = selectEvento ? selectEvento.options[selectEvento.selectedIndex].text : 'General';
            
            const fecha = document.getElementById('fechaInput') ? document.getElementById('fechaInput').value : null;
            const invitados = document.getElementById('invitadosInput') ? parseInt(document.getElementById('invitadosInput').value) : null;
            const detalles = document.getElementById('detallesInput') ? document.getElementById('detallesInput').value : '';

            const { data: { user } } = await supabaseClient.auth.getUser();

            const { error: insertError } = await supabaseClient.from('reservas').insert([{ 
                perfil_id: user ? user.id : null, 
                tipo_evento: tipoEvento, 
                fecha_tentativa: fecha, 
                cantidad_invitados: invitados, 
                detalles: `Nombre: ${nombre} | Correo: ${correo} | Teléfono: ${telefono} | Msj: ${detalles}`, 
                estado: 'pendiente' 
            }]);

            if (insertError) {
                alert('Hubo un error al guardar la reserva: ' + insertError.message);
                return;
            }

            const numeroWhatsApp = '51937220742'; 
            const mensaje = `¡Hola INARA! Soy ${nombre}. Deseo cotizar un evento de tipo: *${tipoEvento}*.%0A%0A*Fecha:* ${fecha}%0A*Invitados:* ${invitados}%0A*Detalles:* ${detalles}%0A*Mi teléfono:* ${telefono}%0A*Mi correo:* ${correo}`;
            window.open(`https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`, '_blank');
            formContacto.reset();
        });
    }

    // ==========================================
    // 4. INICIALIZAR DASHBOARD 
    // ==========================================
    const tablaServiciosBody = document.getElementById('tablaServiciosBody');
    if (tablaServiciosBody) {
        cargarServiciosAdmin();
        cargarReservasAdmin();
        cargarUsuariosAdmin();
    }

    // (Opcional) Si decides integrar dinámicamente la web después
    const contenedorServiciosWeb = document.getElementById('contenedorServiciosWeb');
    if (contenedorServiciosWeb) cargarServiciosWeb();

    // ==========================================
    // 5. CRUD DE SERVICIOS (Formulario Modal)
    // ==========================================
    const formCrudServicio = document.getElementById('formCrudServicio');
    if (formCrudServicio) {
        formCrudServicio.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('idServicioInput').value;
            const nombre = document.getElementById('nombreServInput').value;
            const precio = document.getElementById('precioServInput').value;
            const descripcion = document.getElementById('descServInput').value;
            
            const fileInput = document.getElementById('imgServInput');
            let imagen_url = document.getElementById('imgServOculto').value;

            // Extraer nombre del archivo local y armar ruta
            if (fileInput.files.length > 0) {
                imagen_url = `./assets/img/${fileInput.files[0].name}`;
            }

            if (!imagen_url && !id) {
                alert('Por favor selecciona una imagen de tu computadora para el servicio.');
                return;
            }

            if (id) {
                // MODIFICAR
                const { error } = await supabaseClient.from('servicios').update({ nombre, precio, imagen_url, descripcion }).eq('id', id);
                if (!error) {
                    alert('Servicio actualizado correctamente.');
                    window.location.reload();
                } else alert('Error al actualizar.');
            } else {
                // CREAR
                const { error } = await supabaseClient.from('servicios').insert([{ nombre, precio, imagen_url, descripcion, estado: 'activo' }]);
                if (!error) {
                    alert('Servicio registrado exitosamente.');
                    window.location.reload();
                } else alert('Error al guardar el servicio.');
            }
        });
    }
}); 


// ==========================================
// FUNCIONES GLOBALES (DASHBOARD Y CLIENTE)
// ==========================================
window.listaServiciosGlobal = [];

async function cargarServiciosAdmin() {
    const tabla = document.getElementById('tablaServiciosBody');
    if (!tabla) return;
    const { data: servicios, error } = await supabaseClient.from('servicios').select('*').order('id', { ascending: false });
    if (error) return;

    window.listaServiciosGlobal = servicios;
    tabla.innerHTML = '';
    if(servicios.length === 0) return tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay servicios registrados.</td></tr>';
    
    servicios.forEach(serv => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4"><img src="${serv.imagen_url || './assets/img/matrimonio.jpg'}" class="rounded shadow-sm" style="width: 60px; height: 40px; object-fit: cover;"></td>
            <td class="p-4 fw-bold text-accent">${serv.nombre}</td>
            <td class="p-4">S/ ${serv.precio || '0.00'}</td>
            <td class="p-4"><span class="badge ${serv.estado === 'activo' ? 'bg-success' : 'bg-secondary'} px-3 py-2 rounded-pill shadow-sm">${serv.estado.toUpperCase()}</span></td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicion(${serv.id})" data-bs-toggle="modal" data-bs-target="#modalServicio" title="Editar"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-warning me-2" onclick="toggleEstadoServicio(${serv.id}, '${serv.estado}')" title="Ocultar / Activar"><i class="fa-solid fa-eye-slash"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${serv.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

window.prepararEdicion = function(id) {
    const servicio = window.listaServiciosGlobal.find(s => s.id === id);
    if(servicio) {
        document.getElementById('tituloModalServicio').innerText = 'Modificar Servicio';
        document.getElementById('idServicioInput').value = servicio.id;
        document.getElementById('nombreServInput').value = servicio.nombre;
        document.getElementById('precioServInput').value = servicio.precio;
        document.getElementById('descServInput').value = servicio.descripcion;
        
        document.getElementById('imgServOculto').value = servicio.imagen_url;
        document.getElementById('imgServInput').value = ''; 
        document.getElementById('imgServInput').removeAttribute('required'); 
        
        const txtActual = document.getElementById('imgActualTexto');
        txtActual.classList.remove('d-none');
        txtActual.querySelector('span').innerText = servicio.imagen_url ? servicio.imagen_url.split('/').pop() : 'Ninguna';
        
        document.getElementById('btnGuardarServicio').innerText = 'ACTUALIZAR SERVICIO';
    }
}

window.limpiarModalServicio = function() {
    const form = document.getElementById('formCrudServicio');
    if (form) form.reset();
    document.getElementById('idServicioInput').value = '';
    document.getElementById('imgServOculto').value = '';
    document.getElementById('imgServInput').setAttribute('required', 'true');
    document.getElementById('imgActualTexto').classList.add('d-none');
    document.getElementById('tituloModalServicio').innerText = 'Registrar Servicio';
    document.getElementById('btnGuardarServicio').innerText = 'GUARDAR SERVICIO';
}

async function cargarServiciosWeb() {
    const contenedor = document.getElementById('contenedorServiciosWeb');
    if (!contenedor) return;
    
    const { data: servicios, error } = await supabaseClient.from('servicios').select('*').eq('estado', 'activo').order('id', { ascending: true });
    if (error) return;

    contenedor.innerHTML = '';
    servicios.forEach((serv, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        contenedor.innerHTML += `
            <div class="col-lg-3 col-md-6 mb-4">
                <div class="card-dynamic h-100 border-0 p-0 shadow-sm overflow-hidden" style="border-radius: 15px;">
                    <img src="${serv.imagen_url}" class="card-img-top w-100" style="height: 200px; object-fit: cover;" alt="${serv.nombre}">
                    <div class="card-body p-4 d-flex flex-column">
                        <h5 class="mb-3 text-accent"><span class="text-secondary fw-normal me-2">${num}</span> ${serv.nombre}</h5>
                        <p class="text-secondary mb-4" style="font-size: 0.9rem;">${serv.descripcion}</p>
                        <div class="mt-auto">
                            <h6 class="fw-bold mb-3">Precio Base: S/ ${serv.precio}</h6>
                            <a href="contacto.html?evento=${encodeURIComponent(serv.nombre.toLowerCase())}" class="text-accent text-decoration-none fw-bold">Agendar Servicio <i class="fa-solid fa-arrow-right ms-1"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

async function cargarReservasAdmin() {
    const tabla = document.getElementById('tablaReservasBody');
    if (!tabla) return;
    const { data: reservas, error } = await supabaseClient.from('reservas').select('*').order('id', { ascending: false });
    if (error) return;

    tabla.innerHTML = '';
    if(reservas.length === 0) return tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay reservas pendientes.</td></tr>';
    
    reservas.forEach(res => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        const infoBasica = res.detalles.split('|')[0] + '<br><small class="text-secondary">' + (res.detalles.split('|')[1] || '') + '</small>';
        
        tr.innerHTML = `
            <td class="p-4 fw-medium text-accent">${infoBasica}</td>
            <td class="p-4 fw-bold">${res.tipo_evento}</td>
            <td class="p-4">
                <div class="small"><i class="fa-regular fa-calendar text-accent me-1"></i> ${res.fecha_tentativa || 'Sin fecha'}</div>
                <div class="small mt-1"><i class="fa-solid fa-users text-accent me-1"></i> ${res.cantidad_invitados ? res.cantidad_invitados + ' invitados' : 'N/A'}</div>
            </td>
            <td class="p-4"><span class="badge ${res.estado === 'pendiente' ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 rounded-pill shadow-sm">${res.estado.toUpperCase()}</span></td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-success me-2" onclick="actualizarEstadoReserva(${res.id}, 'atendida')" title="Marcar como Atendida"><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarReserva(${res.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

async function cargarUsuariosAdmin() {
    const contenedor = document.getElementById('contenedorUsuariosAdmin');
    if (!contenedor) return;
    const { data: perfiles, error } = await supabaseClient.from('perfiles').select('*').order('id', { ascending: false });
    if (error) return;

    let html = `
    <div class="table-responsive">
        <table class="table table-borderless table-hover mb-0 align-middle text-secondary">
            <thead class="bg-dynamic-alt text-uppercase small fw-bold">
                <tr>
                    <th class="p-4">Usuario</th>
                    <th class="p-4">Teléfono</th>
                    <th class="p-4">Rol en Sistema</th>
                </tr>
            </thead>
            <tbody>
    `;
    perfiles.forEach(per => {
        html += `
            <tr class="border-bottom">
                <td class="p-4 fw-bold text-accent"><i class="fa-solid fa-circle-user fs-4 me-2 align-middle"></i> ${per.nombre_completo || 'Usuario Anónimo'}</td>
                <td class="p-4">${per.telefono || 'No registrado'}</td>
                <td class="p-4"><span class="badge ${per.rol === 'admin' ? 'bg-danger' : 'bg-primary'} px-3 py-2 rounded-pill shadow-sm">${per.rol.toUpperCase()}</span></td>
            </tr>
        `;
    });
    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
}

window.eliminarServicio = async function(id) {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
        await supabaseClient.from('servicios').delete().eq('id', id);
        cargarServiciosAdmin();
    }
}
window.toggleEstadoServicio = async function(id, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'suspendido' : 'activo';
    await supabaseClient.from('servicios').update({ estado: nuevoEstado }).eq('id', id);
    cargarServiciosAdmin();
}
window.eliminarReserva = async function(id) {
    if (confirm('¿Borrar esta solicitud del registro?')) {
        await supabaseClient.from('reservas').delete().eq('id', id);
        cargarReservasAdmin();
    }
}
window.actualizarEstadoReserva = async function(id, nuevoEstado) {
    await supabaseClient.from('reservas').update({ estado: nuevoEstado }).eq('id', id);
    cargarReservasAdmin();
}