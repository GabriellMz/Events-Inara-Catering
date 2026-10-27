const supabaseUrl = 'https://kkkonlfsmdvquuhrresu.supabase.co';
const supabaseKey = 'sb_publishable_S9LKSwIG3iOTXxHQc9J4rg_7Ok8-zcv';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);


// Control de visibilidad de servicios en la p?gina p?blica
document.addEventListener('DOMContentLoaded', async () => {
    const tarjetas = document.querySelectorAll('[data-servicio-id]');

    if (!tarjetas.length) return;

    const finalizarCarga = () => {
        document.body.classList.remove('servicios-pendientes');
    };

    try {
        const { data, error } = await supabaseClient
            .from('servicios')
            .select('id, estado');

        if (error) throw error;

        const estados = new Map(
            data.map(servicio => [
                String(servicio.id),
                servicio.estado
            ])
        );

        tarjetas.forEach(tarjeta => {
            const id = tarjeta.dataset.servicioId;
            tarjeta.hidden = estados.get(id) !== 'activo';
        });

        finalizarCarga();

    } catch (error) {
        console.error('No se pudieron cargar los servicios:', error);

        tarjetas.forEach(tarjeta => {
            tarjeta.hidden = true;
        });

        finalizarCarga();

        const contenedor = tarjetas[0].parentElement;
        const aviso = document.createElement('p');
        aviso.className = 'text-center text-secondary col-12';
        aviso.textContent =
            'No se pudieron cargar los servicios. Int?ntalo nuevamente m?s tarde.';
        contenedor.appendChild(aviso);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    
    // ==========================================
    // 1. MANEJO DE SESIÓN Y PROTECCIÓN DE RUTAS
    // ==========================================
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'reset-password.html') {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            alert('El enlace de recuperación ha expirado o es inválido.');
            window.location.href = 'login.html';
            return;
        }

        const formNuevaPassword = document.getElementById('formNuevaPassword');
        if (formNuevaPassword) {
            formNuevaPassword.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nuevaPass = document.getElementById('nuevaPass').value;
                
                const { error } = await supabaseClient.auth.updateUser({ password: nuevaPass });
                if (!error) {
                    alert('¡Contraseña actualizada con éxito! Por favor, inicia sesión de nuevo.');
                    await supabaseClient.auth.signOut();
                    window.location.href = 'login.html';
                } else {
                    alert('Hubo un error al actualizar la contraseña: ' + error.message);
                }
            });
        }
        return; 
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    let profile = null;
    let userRole = null;

    if (session && session.user) {
        const emailNormalizado = session.user.email.trim().toLowerCase();

        // Usamos .maybeSingle() para evitar el error 406 en consola
        const { data: adminData } = await supabaseClient
            .from('administradores')
            .select('*')
            .ilike('correo', emailNormalizado)
            .maybeSingle();

        if (adminData) {
            profile = adminData;
            userRole = 'admin';
        } else {
            const { data: clientData } = await supabaseClient
                .from('clientes')
                .select('*')
                .ilike('correo', emailNormalizado)
                .maybeSingle();

            if (clientData) {
                profile = clientData;
                userRole = 'cliente';
            }
        }
    }

    // Reglas de redirección de seguridad
    if (session && profile) {
        if (currentPage === 'login.html') {
            window.location.href = userRole === 'admin' ? 'dashboard.html' : 'index.html';
            return;
        }
        if (currentPage === 'dashboard.html' && userRole !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
    } else {
        if (currentPage === 'dashboard.html') {
            window.location.href = 'login.html';
            return;
        }
    }

    // Actualización visual del Navbar ("Hola, Nombre" / Cerrar Sesión)
    const authContainers = document.querySelectorAll('.auth-container');
    authContainers.forEach(container => {
        if (session && profile) {
            const primerNombre = profile.nombre_completo ? profile.nombre_completo.split(' ')[0] : 'Usuario';
            
            const btnDashboard = userRole === 'admin' 
                ? `<a href="dashboard.html" class="nav-icon-btn ms-1" title="Ir al Dashboard" style="color: var(--accent); text-decoration: none;"><i class="fa-solid fa-chart-line"></i></a>` 
                : '';

            container.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="text-accent fw-bold" style="font-size: 0.9rem;">Hola, ${primerNombre}</span>
                    ${btnDashboard}
                    <button class="nav-icon-btn btn-logout" title="Cerrar Sesión" style="background: none; border: none; padding: 0; cursor: pointer;">
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
    // 2. RECUPERACIÓN DE CONTRASEÑA
    // ==========================================
    const formRecuperarPass = document.getElementById('formRecuperarPass');
    if (formRecuperarPass) {
        formRecuperarPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailRecuperacion').value.trim().toLowerCase();
            const redirectUrl = window.location.href.replace('login.html', 'reset-password.html');

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

            if (error) {
                alert('Error al enviar el enlace. Verifica que el correo esté registrado.');
            } else {
                alert('¡Enlace enviado! Revisa tu bandeja de entrada o carpeta de SPAM.');
                document.querySelector('#modalRecuperar .btn-close').click();
                formRecuperarPass.reset();
            }
        });
    }

    // ==========================================
    // 3. INICIO DE SESIÓN CON PESTAÑAS SEPARADAS
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnActivo = document.querySelector('.role-btn.active');
            const tabActiva = btnActivo ? btnActivo.getAttribute('data-role') : 'cliente';
            
            const email = loginForm.querySelector('input[type="email"]').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;
            
            // 1. Validar credenciales en Supabase Auth
            const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (authError) return alert('Credenciales incorrectas o usuario no registrado.');
            
            // 2. Verificar existencia en tablas separadas
            const { data: adminRecord } = await supabaseClient
                .from('administradores')
                .select('id')
                .ilike('correo', email)
                .maybeSingle();

            const { data: clientRecord } = await supabaseClient
                .from('clientes')
                .select('id')
                .ilike('correo', email)
                .maybeSingle();

            if (!adminRecord && !clientRecord) {
                await supabaseClient.auth.signOut();
                return alert('Tu cuenta no tiene un perfil asociado en el sistema. Contacta al soporte.');
            }

            const rolReal = adminRecord ? 'admin' : 'cliente';

            // 3. Validación estricta según la pestaña del Login
            if (tabActiva !== rolReal) {
                await supabaseClient.auth.signOut(); 
                return alert(`⚠️ ACCESO DENEGADO.\n\nEstás intentando ingresar desde la pestaña de ${tabActiva.toUpperCase()},\npero tu cuenta está registrada como ${rolReal.toUpperCase()}.\n\nPor favor, cambia a la pestaña correcta.`);
            }

            // 4. Redirección según rol
            window.location.href = rolReal === 'admin' ? 'dashboard.html' : 'index.html';
        });
    }

    // ==========================================
    // 4. REGISTRO EXCLUSIVO DE CLIENTES
    // ==========================================
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnCrear = document.getElementById('btnCrearCuenta');
            const textoOriginal = btnCrear.innerText;
            btnCrear.innerText = 'CREANDO CUENTA...';
            btnCrear.disabled = true;

            try {
                const dni = document.getElementById('regDni').value.trim();
                const nombre = document.getElementById('regNombre').value.trim();
                const email = document.getElementById('regEmail').value.trim().toLowerCase();
                const telefono = document.getElementById('regTelefono').value.trim();
                const password = document.getElementById('registerPassword').value;

                // 1. Crear en Auth
                const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

                if (authError) return alert('Error al crear la cuenta: ' + authError.message);

                if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                    return alert('Este correo ya se encuentra registrado. Intenta iniciar sesión.');
                }

                // 2. Insertar en la tabla clientes
                if (authData.user) {
                    const { error: insertError } = await supabaseClient.from('clientes').insert([
                        { dni: dni, nombre_completo: nombre, correo: email, telefono: telefono }
                    ]);

                    if (insertError) {
                        if (insertError.message.includes('duplicate key') || insertError.code === '23505') {
                            alert('El DNI o Correo ya está registrado en la base de datos.');
                        } else {
                            alert('Error al registrar perfil: ' + insertError.message);
                        }
                    } else {
                        await supabaseClient.auth.signOut(); 
                        alert('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión como Cliente.');
                        document.getElementById('btnSwitchToLogin').click();
                        registerForm.reset();
                    }
                }
            } catch (err) { 
                console.error(err); 
            } finally {
                btnCrear.innerText = textoOriginal;
                btnCrear.disabled = false;
            }
        });
    }

    // ==========================================
    // 5. FORMULARIO DE RESERVAS (CONTACTO)
    // ==========================================
    const formContacto = document.getElementById('formContacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombreInput') ? document.getElementById('nombreInput').value : 'Cliente';
            const correo = document.getElementById('correoInput') ? document.getElementById('correoInput').value.trim().toLowerCase() : '';
            const telefono = document.getElementById('telefonoInput') ? document.getElementById('telefonoInput').value : '';
            const selectEvento = document.getElementById('tipoEvento');
            const tipoEvento = selectEvento ? selectEvento.options[selectEvento.selectedIndex].text : 'General';
            const fecha = document.getElementById('fechaInput') ? document.getElementById('fechaInput').value : null;
            const invitados = document.getElementById('invitadosInput') ? parseInt(document.getElementById('invitadosInput').value) : null;
            const detalles = document.getElementById('detallesInput') ? document.getElementById('detallesInput').value : '';

            // Vinculación con el ID numérico de clientes
            const clienteIdInsert = (userRole === 'cliente' && profile) ? profile.id : null;

            const { error: insertError } = await supabaseClient.from('reservas').insert([{ 
                cliente_id: clienteIdInsert, 
                tipo_evento: tipoEvento, 
                fecha_tentativa: fecha, 
                cantidad_invitados: invitados, 
                detalles: `Nombre: ${nombre} | Correo: ${correo} | Teléfono: ${telefono} | Msj: ${detalles}`, 
                estado: 'Pendiente' 
            }]);

            if (insertError) return alert('Hubo un error al guardar la reserva: ' + insertError.message);
            
            const numeroWhatsApp = '51937220742'; 
            const mensaje = `¡Hola INARA! Soy ${nombre}. Deseo cotizar un evento de tipo: *${tipoEvento}*.%0A%0A*Fecha:* ${fecha || 'A coordinar'}%0A*Invitados:* ${invitados || 'A coordinar'}%0A*Detalles:* ${detalles}%0A*Mi teléfono:* ${telefono}%0A*Mi correo:* ${correo}`;
            window.open(`https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`, '_blank');
            formContacto.reset();
        });
    }

    // Inicializar tablas si estamos en el dashboard
    const tablaReservasBody = document.getElementById('tablaReservasBody');
    if (tablaReservasBody) {
        cargarServiciosAdmin();
        cargarReservasAdmin();
        cargarUsuariosAdmin();
        cargarExtrasAdmin(); 
        cargarProveedoresAdmin(); 
    }

    // ==========================================
    // 6. CRUD SERVICIOS
    // ==========================================
    const formCrudServicio = document.getElementById('formCrudServicio');
    if (formCrudServicio) {
        formCrudServicio.addEventListener('submit', async (e) => {
            e.preventDefault();

            const botonGuardarServicio = formCrudServicio.querySelector('button[type="submit"]');
            if (botonGuardarServicio.disabled) return;

            const id = document.getElementById('idServicioInput').value;
            const nombre = document.getElementById('nombreServInput').value.trim();
            const precio = Number(document.getElementById('precioServInput').value);
            const descripcion = document.getElementById('descServInput').value.trim();
            const fileInput = document.getElementById('imgServInput');
            let imagen_url = document.getElementById('imgServOculto').value;

            if (!nombre || !descripcion || !Number.isFinite(precio) || precio < 0) {
                alert('Verifica el nombre, precio y descripcion del servicio.');
                return;
            }

            // Se conserva el manejo de imagenes existente.
            if (fileInput.files.length > 0) {
                imagen_url = `./assets/img/${fileInput.files[0].name}`;
            }

            if (!imagen_url && !id) {
                alert('Selecciona una imagen.');
                return;
            }

            botonGuardarServicio.disabled = true;
            const textoOriginal = botonGuardarServicio.textContent;
            botonGuardarServicio.textContent = 'GUARDANDO...';

            try {
                let resultado;

                if (id) {
                    resultado = await supabaseClient
                        .from('servicios')
                        .update({ nombre, precio, imagen_url, descripcion })
                        .eq('id', id)
                        .select('id');
                } else {
                    resultado = await supabaseClient
                        .from('servicios')
                        .insert([{
                            nombre,
                            precio,
                            imagen_url,
                            descripcion,
                            estado: 'activo'
                        }])
                        .select('id');
                }

                if (resultado.error) throw resultado.error;

                if (!resultado.data || resultado.data.length !== 1) {
                    throw new Error('No se confirmo el guardado de un unico servicio.');
                }

                await cargarServiciosAdmin();

                const modalElemento = document.getElementById('modalServicio');
                const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);
                modal.hide();

            } catch (error) {
                console.error('Error al guardar servicio:', error);
                alert('No se pudo guardar el servicio. Revisa los datos e intenta nuevamente.');
            } finally {
                botonGuardarServicio.disabled = false;
                botonGuardarServicio.textContent = textoOriginal;
            }
        });
    }

    // ==========================================
    // 7. CRUD EXTRAS
    // ==========================================
    const formCrudExtra = document.getElementById('formCrudExtra');
    if (formCrudExtra) {
        formCrudExtra.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('idExtraInput').value;
            const nombre = document.getElementById('nombreExtraInput').value;
            const precio = parseFloat(document.getElementById('precioExtraInput').value);
            const descripcion = document.getElementById('descExtraInput').value;

            if (id) {
                await supabaseClient.from('extras').update({ nombre, precio_unitario: precio, descripcion }).eq('id', id);
            } else {
                await supabaseClient.from('extras').insert([{ nombre, precio_unitario: precio, descripcion }]);
            }
            
            document.querySelector('#modalExtra .btn-close').click();
            cargarExtrasAdmin();
        });
    }

    // ==========================================
    // 8. CRUD PROVEEDORES
    // ==========================================
    const formCrudProveedor = document.getElementById('formCrudProveedor');
    if (formCrudProveedor) {
        formCrudProveedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('idProveedorInput').value;
            const empresa = document.getElementById('empresaProvInput').value;
            const contacto = document.getElementById('contactoProvInput').value;
            const telefono = document.getElementById('telefonoProvInput').value;
            const especialidad = document.getElementById('especialidadProvInput').value;

            if (id) {
                await supabaseClient.from('proveedores').update({ nombre_empresa: empresa, contacto, telefono, especialidad }).eq('id', id);
            } else {
                await supabaseClient.from('proveedores').insert([{ nombre_empresa: empresa, contacto, telefono, especialidad }]);
            }
            
            document.querySelector('#modalProveedor .btn-close').click();
            cargarProveedoresAdmin();
        });
    }

    // ==========================================
    // 9. ACTUALIZACIÓN DE ESTADO Y NOTA DE RESERVAS
    // ==========================================
    const formNotaReserva = document.getElementById('formNotaReserva');
    if (formNotaReserva) {
        formNotaReserva.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idReserva = document.getElementById('idReservaNotaInput').value;
            const nota = document.getElementById('notaReservaInput').value;
            const estadoNuevo = document.getElementById('estadoReservaSelect').value;

            const { error } = await supabaseClient
                .from('reservas')
                .update({ nota_admin: nota, estado: estadoNuevo })
                .eq('id', idReserva);
            
            if (!error) {
                document.querySelector('#modalNotaReserva .btn-close').click();
                cargarReservasAdmin(); 
            } else {
                alert('Error al actualizar la solicitud: ' + error.message);
            }
        });
    }

    // ==========================================
    // 10. EDICIÓN DE ROL DE USUARIOS
    // ==========================================
    const formEditarRol = document.getElementById('formEditarRol');
    if (formEditarRol) {
        formEditarRol.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idUsuario = document.getElementById('idUsuarioRol').value;
            const rolActual = document.getElementById('rolActualUsuario').value;
            const nuevoRol = document.getElementById('selectRolUsuario').value;

            if (rolActual === nuevoRol) return document.querySelector('#modalEditarRol .btn-close').click();

            const tablaOrigen = rolActual === 'admin' ? 'administradores' : 'clientes';
            const tablaDestino = nuevoRol === 'admin' ? 'administradores' : 'clientes';

            const { data: userData } = await supabaseClient.from(tablaOrigen).select('*').eq('id', idUsuario).single();

            if (userData) {
                const { error: insertError } = await supabaseClient.from(tablaDestino).insert([{
                    dni: userData.dni, 
                    nombre_completo: userData.nombre_completo, 
                    correo: userData.correo, 
                    telefono: userData.telefono
                }]);

                if (!insertError) {
                    const { error: deleteError } = await supabaseClient.from(tablaOrigen).delete().eq('id', idUsuario);
                    if (deleteError) {
                        alert('El usuario se copió al nuevo rol, pero no se pudo eliminar de la tabla anterior debido a registros vinculados (ej. reservas): ' + deleteError.message);
                    }
                    document.querySelector('#modalEditarRol .btn-close').click();
                    cargarUsuariosAdmin(); 
                } else {
                    alert('Error al transferir de tabla: ' + insertError.message);
                }
            }
        });
    }
}); 

// ==========================================
// FUNCIONES GLOBALES PARA EL DASHBOARD
// ==========================================
window.listaServiciosGlobal = [];
window.listaReservasGlobal = [];
window.listaAdminsGlobal = [];
window.listaClientesGlobal = [];
window.listaExtrasGlobal = [];
window.listaProveedoresGlobal = [];

async function cargarReservasAdmin() {
    const tabla = document.getElementById('tablaReservasBody');
    if (!tabla) return;
    const { data: reservas, error } = await supabaseClient.from('reservas').select('*').order('id', { ascending: false });
    if (error) return;

    window.listaReservasGlobal = reservas || []; 
    tabla.innerHTML = '';
    
    let countPendiente = 0, countProceso = 0, countConcreto = 0, countNoConcreto = 0;
    
    if (window.listaReservasGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay reservas registradas.</td></tr>';
    } else {
        window.listaReservasGlobal.forEach(res => {
            if (res.estado === 'Pendiente') countPendiente++;
            if (res.estado === 'En proceso') countProceso++;
            if (res.estado === 'Se concretó') countConcreto++;
            if (res.estado === 'No se concretó') countNoConcreto++;

            const tr = document.createElement('tr');
            tr.className = 'border-bottom';
            const partes = res.detalles ? res.detalles.split('|') : [];
            const nombre = partes[0] ? partes[0].replace('Nombre: ', '').trim() : 'Cliente';
            const correo = partes[1] ? partes[1].replace('Correo: ', '').trim() : '-';

            let badgeClase = 'estado-pendiente';
            if (res.estado === 'En proceso') badgeClase = 'estado-proceso';
            if (res.estado === 'Se concretó') badgeClase = 'estado-concreto';
            if (res.estado === 'No se concretó') badgeClase = 'estado-noconcreto';

            tr.innerHTML = `
                <td class="p-4 py-3"><div class="fw-bold text-accent">${nombre}</div><small class="text-secondary">${correo}</small></td>
                <td class="p-4 py-3"><span class="fw-medium"><i class="fa-solid fa-champagne-glasses text-secondary me-2"></i>${res.tipo_evento}</span></td>
                <td class="p-4 py-3">
                    <div class="small fw-bold">${res.fecha_tentativa || 'Sin fecha'}</div>
                    <div class="small text-secondary mt-1">${res.cantidad_invitados ? res.cantidad_invitados + ' pax' : 'N/A'}</div>
                </td>
                <td class="p-4 py-3"><span class="badge-estado ${badgeClase}"><i class="fa-solid fa-circle me-1" style="font-size:8px;"></i> ${res.estado.toUpperCase()}</span></td>
                <td class="p-4 py-3 text-end">
                    <button class="btn btn-sm btn-outline-secondary me-2" onclick="abrirModalNota(${res.id})" data-bs-toggle="modal" data-bs-target="#modalNotaReserva"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarReserva(${res.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    }

    if (document.getElementById('kpiTotal')) document.getElementById('kpiTotal').innerText = window.listaReservasGlobal.length;
    if (document.getElementById('kpiPendientes')) document.getElementById('kpiPendientes').innerText = countPendiente;
    if (document.getElementById('kpiProceso')) document.getElementById('kpiProceso').innerText = countProceso;
    if (document.getElementById('kpiConcreto')) document.getElementById('kpiConcreto').innerText = countConcreto;
    if (document.getElementById('kpiNoConcreto')) document.getElementById('kpiNoConcreto').innerText = countNoConcreto;
}

window.abrirModalNota = function(idReserva) {
    const reserva = window.listaReservasGlobal.find(r => r.id === idReserva);
    if (reserva) {
        document.getElementById('idReservaNotaInput').value = reserva.id;
        document.getElementById('notaReservaInput').value = reserva.nota_admin || ''; 
        const estadoSelect = document.getElementById('estadoReservaSelect');
        if (estadoSelect.querySelector(`option[value="${reserva.estado}"]`)) estadoSelect.value = reserva.estado;
        else estadoSelect.value = 'Pendiente'; 
    }
};

window.eliminarReserva = async function(id) {
    if (confirm('¿Deseas eliminar permanentemente esta solicitud de reserva?')) { 
        await supabaseClient.from('reservas').delete().eq('id', id); 
        cargarReservasAdmin(); 
    }
};

async function cargarServiciosAdmin() {
    const tabla = document.getElementById('tablaServiciosBody');
    if (!tabla) return;
    const { data: servicios } = await supabaseClient.from('servicios').select('*').order('id', { ascending: true });
    window.listaServiciosGlobal = servicios || [];
    tabla.innerHTML = '';

    if (window.listaServiciosGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay servicios registrados.</td></tr>';
        return;
    }

    window.listaServiciosGlobal.forEach(serv => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4"><img src="${serv.imagen_url || './assets/img/matrimonio.jpg'}" class="rounded shadow-sm" style="width: 60px; height: 40px; object-fit: cover;"></td>
            <td class="p-4 fw-bold text-accent">${serv.nombre}</td>
            <td class="p-4">S/ ${parseFloat(serv.precio || 0).toFixed(2)}</td>
            <td class="p-4">
                <span class="badge ${serv.estado === 'activo' ? 'bg-success' : 'bg-secondary'}">
                    ${serv.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicion(${serv.id})" data-bs-toggle="modal" data-bs-target="#modalServicio"><i class="fa-solid fa-pen"></i></button>
                <button
                    class="btn btn-sm btn-outline-warning me-2"
                    onclick="cambiarEstadoServicio(${serv.id})"
                    title="${serv.estado === 'activo' ? 'Suspender servicio' : 'Reactivar servicio'}"
                    aria-label="${serv.estado === 'activo' ? 'Suspender servicio' : 'Reactivar servicio'}">
                    <i class="fa-solid ${serv.estado === 'activo' ? 'fa-eye-slash' : 'fa-eye'}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${serv.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}


window.cambiarEstadoServicio = async function(id) {
    const servicio = window.listaServiciosGlobal.find(
        s => String(s.id) === String(id)
    );

    if (!servicio) {
        console.error('Servicio no encontrado:', id);
        return;
    }

    const boton = Array.from(
        document.querySelectorAll('#tablaServiciosBody button')
    ).find(b => b.getAttribute('onclick') === `cambiarEstadoServicio(${id})`);

    if (!boton || boton.disabled) return;

    const nuevoEstado = servicio.estado === 'activo'
        ? 'inactivo'
        : 'activo';

    boton.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('servicios')
            .update({ estado: nuevoEstado })
            .eq('id', id)
            .select('id, estado')
            .single();

        if (error) throw error;

        servicio.estado = data.estado;

        const fila = boton.closest('tr');
        const badge = fila.querySelector('span.badge');
        const icono = boton.querySelector('i');

        const activo = data.estado === 'activo';

        badge.textContent = activo ? 'Activo' : 'Inactivo';
        badge.classList.toggle('bg-success', activo);
        badge.classList.toggle('bg-secondary', !activo);

        icono.classList.toggle('fa-eye-slash', activo);
        icono.classList.toggle('fa-eye', !activo);

        const texto = activo
            ? 'Suspender servicio'
            : 'Reactivar servicio';

        boton.title = texto;
        boton.setAttribute('aria-label', texto);

        console.log('Estado actualizado:', data.estado);

    } catch (error) {
        console.error('Error al actualizar el servicio:', error);
        alert('No se pudo actualizar el estado del servicio.');
    } finally {
        boton.disabled = false;
    }
};

window.prepararEdicion = function(id) {
    const servicio = window.listaServiciosGlobal.find(s => s.id === id);
    if (servicio) {
        document.getElementById('idServicioInput').value = servicio.id;
        document.getElementById('nombreServInput').value = servicio.nombre;
        document.getElementById('precioServInput').value = servicio.precio;
        document.getElementById('descServInput').value = servicio.descripcion;
        document.getElementById('imgServOculto').value = servicio.imagen_url;
        document.getElementById('imgServInput').removeAttribute('required'); 
        document.getElementById('tituloModalServicio').innerText = 'Editar Servicio';
    }
};

window.limpiarModalServicio = function() { 
    document.getElementById('formCrudServicio').reset(); 
    document.getElementById('idServicioInput').value = ''; 
    document.getElementById('imgServInput').setAttribute('required', 'true');
    document.getElementById('tituloModalServicio').innerText = 'Nuevo Servicio';
};

window.eliminarServicio = async function(id) {
    if (confirm('¿Estás seguro de eliminar este servicio?')) { 
        await supabaseClient.from('servicios').delete().eq('id', id); 
        cargarServiciosAdmin(); 
    }
};

async function cargarExtrasAdmin() {
    const tabla = document.getElementById('tablaExtrasBody');
    if (!tabla) return;
    const { data: extras } = await supabaseClient.from('extras').select('*').order('id', { ascending: true });
    window.listaExtrasGlobal = extras || [];
    tabla.innerHTML = '';
    
    if (window.listaExtrasGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay extras registrados.</td></tr>';
        return;
    }

    window.listaExtrasGlobal.forEach(ext => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4 fw-bold text-accent">${ext.nombre}</td>
            <td class="p-4 small">${ext.descripcion || '-'}</td>
            <td class="p-4 fw-medium text-success">S/ ${parseFloat(ext.precio_unitario || 0).toFixed(2)}</td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicionExtra(${ext.id})" data-bs-toggle="modal" data-bs-target="#modalExtra"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarExtra(${ext.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

window.prepararEdicionExtra = function(id) {
    const ext = window.listaExtrasGlobal.find(e => e.id === id);
    if (ext) {
        document.getElementById('idExtraInput').value = ext.id;
        document.getElementById('nombreExtraInput').value = ext.nombre;
        document.getElementById('precioExtraInput').value = ext.precio_unitario;
        document.getElementById('descExtraInput').value = ext.descripcion;
        document.getElementById('tituloModalExtra').innerText = 'Editar Extra';
    }
};

window.limpiarModalExtra = function() { 
    document.getElementById('formCrudExtra').reset(); 
    document.getElementById('idExtraInput').value = ''; 
    document.getElementById('tituloModalExtra').innerText = 'Nuevo Extra';
};

window.eliminarExtra = async function(id) {
    if (confirm('¿Eliminar este extra?')) { 
        await supabaseClient.from('extras').delete().eq('id', id); 
        cargarExtrasAdmin(); 
    }
};

async function cargarProveedoresAdmin() {
    const tabla = document.getElementById('tablaProveedoresBody');
    if (!tabla) return;
    const { data: prov } = await supabaseClient.from('proveedores').select('*').order('id', { ascending: true });
    window.listaProveedoresGlobal = prov || [];
    tabla.innerHTML = '';

    if (window.listaProveedoresGlobal.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No hay proveedores registrados.</td></tr>';
        return;
    }

    window.listaProveedoresGlobal.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'border-bottom';
        tr.innerHTML = `
            <td class="p-4 fw-bold text-accent"><i class="fa-solid fa-building me-2 text-secondary"></i>${p.nombre_empresa}</td>
            <td class="p-4"><i class="fa-solid fa-user me-2 text-secondary"></i>${p.contacto || '-'}</td>
            <td class="p-4"><i class="fa-solid fa-phone me-2 text-secondary"></i>${p.telefono || '-'}</td>
            <td class="p-4"><span class="badge bg-dynamic-alt text-accent border border-1">${p.especialidad}</span></td>
            <td class="p-4 text-end">
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="prepararEdicionProveedor(${p.id})" data-bs-toggle="modal" data-bs-target="#modalProveedor"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="eliminarProveedor(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabla.appendChild(tr);
    });
}

window.prepararEdicionProveedor = function(id) {
    const p = window.listaProveedoresGlobal.find(e => e.id === id);
    if (p) {
        document.getElementById('idProveedorInput').value = p.id;
        document.getElementById('empresaProvInput').value = p.nombre_empresa;
        document.getElementById('contactoProvInput').value = p.contacto;
        document.getElementById('telefonoProvInput').value = p.telefono;
        document.getElementById('especialidadProvInput').value = p.especialidad;
        document.getElementById('tituloModalProveedor').innerText = 'Editar Proveedor';
    }
};

window.limpiarModalProveedor = function() { 
    document.getElementById('formCrudProveedor').reset(); 
    document.getElementById('idProveedorInput').value = ''; 
    document.getElementById('tituloModalProveedor').innerText = 'Nuevo Proveedor';
};

window.eliminarProveedor = async function(id) {
    if (confirm('¿Eliminar este proveedor?')) { 
        await supabaseClient.from('proveedores').delete().eq('id', id); 
        cargarProveedoresAdmin(); 
    }
};

async function cargarUsuariosAdmin() {
    const tablaAdmin = document.getElementById('tablaUsuariosAdminBody');
    const tablaCliente = document.getElementById('tablaUsuariosClienteBody');
    if (!tablaAdmin || !tablaCliente) return;

    const { data: admins } = await supabaseClient.from('administradores').select('*').order('id', { ascending: true });
    const { data: clientes } = await supabaseClient.from('clientes').select('*').order('id', { ascending: true });

    window.listaAdminsGlobal = admins || [];
    window.listaClientesGlobal = clientes || [];
    
    tablaAdmin.innerHTML = '';
    tablaCliente.innerHTML = '';

    if (window.listaAdminsGlobal.length === 0) {
        tablaAdmin.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay administradores registrados.</td></tr>';
    } else {
        window.listaAdminsGlobal.forEach(per => renderUsuarioFila(per, tablaAdmin, 'admin'));
    }

    if (window.listaClientesGlobal.length === 0) {
        tablaCliente.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay clientes registrados.</td></tr>';
    } else {
        window.listaClientesGlobal.forEach(per => renderUsuarioFila(per, tablaCliente, 'cliente'));
    }
}

function renderUsuarioFila(per, tablaBody, tipo) {
    const tr = document.createElement('tr');
    tr.className = 'border-bottom';
    tr.innerHTML = `
        <td class="p-4 fw-bold text-secondary">${per.dni || 'S/N'}</td>
        <td class="p-4 fw-bold text-accent"><i class="fa-solid fa-circle-user fs-4 me-2 align-middle"></i> ${per.nombre_completo || 'Usuario'}</td>
        <td class="p-4 small">
            <div><i class="fa-solid fa-envelope me-1 text-secondary"></i> ${per.correo}</div>
            <div class="mt-1"><i class="fa-solid fa-phone me-1 text-secondary"></i> ${per.telefono || 'Sin registro'}</div>
        </td>
        <td class="p-4 text-end">
            <button class="btn btn-sm btn-outline-primary me-2" onclick="prepararEdicionRol(${per.id}, '${tipo}')" data-bs-toggle="modal" data-bs-target="#modalEditarRol"><i class="fa-solid fa-user-gear"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${per.id}, '${tipo}')"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    tablaBody.appendChild(tr);
}

window.prepararEdicionRol = function(idUsuario, tipo) {
    const usuario = tipo === 'admin' 
        ? window.listaAdminsGlobal.find(u => u.id === idUsuario) 
        : window.listaClientesGlobal.find(u => u.id === idUsuario);

    if (usuario) {
        document.getElementById('idUsuarioRol').value = usuario.id;
        document.getElementById('rolActualUsuario').value = tipo;
        document.getElementById('selectRolUsuario').value = tipo;
    }
};

window.eliminarUsuario = async function(id, tipo) {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente a este ${tipo}?`)) {
        const tabla = tipo === 'admin' ? 'administradores' : 'clientes';
        const { error } = await supabaseClient.from(tabla).delete().eq('id', id);
        if (!error) cargarUsuariosAdmin();
        else alert('No se pudo eliminar el registro: ' + error.message);
    }
};

// ==========================================
// 11. MÓDULO DE RESEÑAS EN EL INDEX.HTML
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const contenedorResenas = document.getElementById('contenedorResenas');
    if (contenedorResenas) {
        cargarResenasPublicas();
        configurarEstrellas();
    }

    const formNuevaResena = document.getElementById('formNuevaResena');
    if (formNuevaResena) {
        formNuevaResena.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) { 
                alert('Debes iniciar sesión como cliente para poder dejar una reseña.'); 
                window.location.href = 'login.html'; 
                return; 
            }

            const { data: perfilData } = await supabaseClient
                .from('clientes')
                .select('id, nombre_completo')
                .ilike('correo', session.user.email.trim().toLowerCase())
                .maybeSingle();

            if (!perfilData) return alert('Solo los clientes registrados pueden publicar reseñas.');

            const calificacion = document.getElementById('calificacionInput').value;
            const comentario = document.getElementById('comentarioResenaInput').value;

            const { error } = await supabaseClient.from('resenas').insert([{ 
                cliente_id: perfilData.id, 
                calificacion: parseInt(calificacion), 
                comentario: comentario, 
                estado: 'aprobado' 
            }]);

            if (!error) {
                alert('¡Gracias por tu reseña! Se ha publicado correctamente.');
                document.querySelector('#modalNuevaResena .btn-close').click();
                formNuevaResena.reset();
                cargarResenasPublicas(); 
            } else {
                alert('Hubo un error al publicar la reseña: ' + error.message);
            }
        });
    }

    async function cargarResenasPublicas() {
        const { data: resenas, error } = await supabaseClient
            .from('resenas')
            .select(`id, calificacion, comentario, clientes (nombre_completo)`)
            .eq('estado', 'aprobado')
            .order('id', { ascending: false })
            .limit(3); 

        if (error || !resenas) return contenedorResenas.innerHTML = '<p class="text-secondary text-center">No se pudieron cargar los testimonios.</p>';
        if (resenas.length === 0) return contenedorResenas.innerHTML = '<p class="text-secondary text-center">Aún no hay reseñas. ¡Sé el primero en dejar una!</p>';

        contenedorResenas.innerHTML = '';
        resenas.forEach(res => {
            let estrellasHTML = '';
            for (let i = 0; i < 5; i++) {
                if (i < res.calificacion) estrellasHTML += '<i class="fa-solid fa-star"></i>';
                else estrellasHTML += '<i class="fa-regular fa-star text-secondary" style="opacity:0.3"></i>';
            }
            const nombreCliente = res.clientes ? res.clientes.nombre_completo : 'Familia INARA';
            const col = document.createElement('div');
            col.className = 'col-lg-4';
            col.innerHTML = `
                <div class="card-dynamic p-4 h-100">
                    <div class="d-flex text-accent mb-3 fs-5">${estrellasHTML}</div>
                    <p class="fst-italic mb-4">"${res.comentario}"</p>
                    <h6 class="fw-bold mb-0 text-accent">${nombreCliente}</h6>
                    <small class="text-secondary">Cliente Verificado</small>
                </div>
            `;
            contenedorResenas.appendChild(col);
        });
    }

    function configurarEstrellas() {
        const estrellas = document.querySelectorAll('#starRatingSelector i');
        const inputOculto = document.getElementById('calificacionInput');
        estrellas.forEach(star => {
            star.addEventListener('click', function() {
                const valor = parseInt(this.getAttribute('data-val'));
                inputOculto.value = valor;
                estrellas.forEach((s, index) => {
                    if (index < valor) { 
                        s.classList.remove('fa-regular', 'text-secondary'); 
                        s.classList.add('fa-solid', 'text-accent'); 
                    } else { 
                        s.classList.remove('fa-solid', 'text-accent'); 
                        s.classList.add('fa-regular', 'text-secondary'); 
                    }
                });
            });
        });
        if (estrellas.length > 0) estrellas[4].click();
    }
});