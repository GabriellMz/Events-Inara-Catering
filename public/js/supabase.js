const supabaseUrl = 'https://kkkonlfsmdvquuhrresu.supabase.co';
const supabaseKey = 'sb_publishable_S9LKSwIG3iOTXxHQc9J4rg_7Ok8-zcv';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================================================
// SISTEMA DE MODALES ELEGANTES INARA (UX & FEEDBACK NAYHA)
// ==========================================================================

function asegurarModalesEnDOM() {
    if (!document.getElementById('modalFeedback')) {
        const modalHtml = `
        <div class="modal fade" id="modalFeedback" tabindex="-1" aria-hidden="true" style="z-index: 1090;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 text-center p-4 shadow-lg modal-inara-feedback">
                    <div class="modal-body p-0">
                        <div id="feedbackIconContainer" class="mb-3 d-flex justify-content-center"></div>
                        <h5 class="fw-bold mb-2" id="feedbackTitulo">Mensaje</h5>
                        <p class="text-secondary small mb-4" id="feedbackMensaje"></p>
                        <button type="button" class="btn-main w-100 py-2 rounded-pill" data-bs-dismiss="modal">Aceptar</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="modalConfirmacion" tabindex="-1" aria-hidden="true" style="z-index: 1090;">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 text-center p-4 shadow-lg modal-inara-feedback">
                    <div class="modal-body p-0">
                        <div class="mx-auto mb-3 border border-warning border-2 rounded-circle d-flex align-items-center justify-content-center feedback-icon-badge badge-warning">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <h5 class="fw-bold mb-2 text-accent" id="confirmTitulo">¿Estás seguro?</h5>
                        <p class="text-secondary small mb-4" id="confirmMensaje">Esta acción no se puede deshacer.</p>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-outline-secondary w-50 py-2 rounded-pill small" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" id="btnConfirmarAccion" class="btn btn-danger w-50 py-2 rounded-pill small">Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

window.mostrarFeedback = function(tipo, titulo, mensaje) {
    asegurarModalesEnDOM();
    const modalEl = document.getElementById('modalFeedback');
    const iconContainer = document.getElementById('feedbackIconContainer');
    const tituloEl = document.getElementById('feedbackTitulo');
    const mensajeEl = document.getElementById('feedbackMensaje');

    tituloEl.innerText = titulo;
    mensajeEl.innerHTML = mensaje.replace(/\n/g, '<br>');

    if (tipo === 'exito') {
        iconContainer.innerHTML = `
            <div class="mx-auto border border-success border-2 rounded-circle d-flex align-items-center justify-content-center feedback-icon-badge badge-success">
                <i class="fa-solid fa-check"></i>
            </div>`;
        tituloEl.className = 'fw-bold mb-2 text-success';
    } else if (tipo === 'advertencia') {
        iconContainer.innerHTML = `
            <div class="mx-auto border border-warning border-2 rounded-circle d-flex align-items-center justify-content-center feedback-icon-badge badge-warning">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>`;
        tituloEl.className = 'fw-bold mb-2 text-warning';
    } else {
        iconContainer.innerHTML = `
            <div class="mx-auto border border-danger border-2 rounded-circle d-flex align-items-center justify-content-center feedback-icon-badge badge-danger">
                <i class="fa-solid fa-xmark"></i>
            </div>`;
        tituloEl.className = 'fw-bold mb-2 text-danger';
    }

    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();
};

window.confirmarAccionModal = function(titulo, mensaje, onConfirmar) {
    asegurarModalesEnDOM();
    const modalEl = document.getElementById('modalConfirmacion');
    document.getElementById('confirmTitulo').innerText = titulo;
    document.getElementById('confirmMensaje').innerText = mensaje;
    
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    
    const nuevoBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(nuevoBtn, btnConfirmar);

    nuevoBtn.addEventListener('click', async () => {
        modalInstance.hide();
        await onConfirmar();
    });

    modalInstance.show();
};

// ==========================================================================
// CONTROL DE VISIBILIDAD DE SERVICIOS EN CATÁLOGO & RESTRICCIÓN DE FECHAS
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    asegurarModalesEnDOM();

    // Restricción automática de fecha mínima al día de hoy
    const fechaInput = document.getElementById('fechaInput');
    if (fechaInput) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        fechaInput.setAttribute('min', `${yyyy}-${mm}-${dd}`);
    }

    const tarjetas = document.querySelectorAll('[data-servicio-id]');
    if (tarjetas.length) {
        try {
            const { data, error } = await supabaseClient.from('servicios').select('id, estado');
            if (error) throw error;

            const estados = new Map(data.map(servicio => [String(servicio.id), servicio.estado]));
            tarjetas.forEach(tarjeta => {
                const id = tarjeta.dataset.servicioId;
                tarjeta.hidden = estados.get(id) !== 'activo';
            });
            document.body.classList.remove('servicios-pendientes');
        } catch (error) {
            console.error('No se pudieron cargar los servicios:', error);
            tarjetas.forEach(tarjeta => tarjeta.hidden = true);
            document.body.classList.remove('servicios-pendientes');
        }
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
            mostrarFeedback('error', 'Enlace Inválido', 'El enlace de recuperación ha expirado o no es válido.');
            setTimeout(() => { window.location.href = 'login.html'; }, 2200);
            return;
        }

        const formNuevaPassword = document.getElementById('formNuevaPassword');
        if (formNuevaPassword) {
            formNuevaPassword.addEventListener('submit', async (e) => {
                e.preventDefault();
                const nuevaPass = document.getElementById('nuevaPass').value;
                
                const { error } = await supabaseClient.auth.updateUser({ password: nuevaPass });
                if (!error) {
                    mostrarFeedback('exito', 'Contraseña Actualizada', 'Tu contraseña se cambió con éxito. Inicia sesión nuevamente.');
                    await supabaseClient.auth.signOut();
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else {
                    mostrarFeedback('error', 'Error al Actualizar', error.message);
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

    if (session && profile) {
        if (currentPage === 'login.html') return window.location.href = userRole === 'admin' ? 'dashboard.html' : 'index.html';
        if (currentPage === 'dashboard.html' && userRole !== 'admin') return window.location.href = 'index.html';
    } else {
        if (currentPage === 'dashboard.html') return window.location.href = 'login.html';
    }

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
                </div>`;
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
    // 2. RECUPERAR CONTRASEÑA
    // ==========================================
    const formRecuperarPass = document.getElementById('formRecuperarPass');
    if (formRecuperarPass) {
        formRecuperarPass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('emailRecuperacion').value.trim().toLowerCase();
            const redirectUrl = window.location.href.replace('login.html', 'reset-password.html');

            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

            if (error) {
                mostrarFeedback('error', 'Correo no Registrado', 'Verifica que el correo electrónico ingresado sea el correcto.');
            } else {
                mostrarFeedback('exito', 'Enlace Enviado', 'Revisa tu bandeja de entrada o spam para restablecer tu contraseña.');
                const btnCerrar = document.querySelector('#modalRecuperar .btn-close');
                if (btnCerrar) btnCerrar.click();
                formRecuperarPass.reset();
            }
        });
    }

    // ==========================================
    // 3. INICIO DE SESIÓN CON MODALES
    // ==========================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnActivo = document.querySelector('.role-btn.active');
            const tabActiva = btnActivo ? btnActivo.getAttribute('data-role') : 'cliente';
            
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;
            
            const { error: authError } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (authError) {
                return mostrarFeedback('error', 'Credenciales Incorrectas', 'El correo o la contraseña son incorrectos. Inténtalo de nuevo.');
            }
            
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
                return mostrarFeedback('error', 'Cuenta Sin Perfil', 'No se encontró un perfil activo vinculado a estas credenciales.');
            }

            const rolReal = adminRecord ? 'admin' : 'cliente';

            if (tabActiva !== rolReal) {
                await supabaseClient.auth.signOut(); 
                return mostrarFeedback('advertencia', 'Acceso Denegado', 
                    `Estás intentando ingresar desde la pestaña de <strong>${tabActiva.toUpperCase()}</strong>, pero tu cuenta pertenece al rol de <strong>${rolReal.toUpperCase()}</strong>.<br><br>Por favor, cambia de pestaña para iniciar sesión.`);
            }

            window.location.href = rolReal === 'admin' ? 'dashboard.html' : 'index.html';
        });
    }

    // ==========================================
    // 4. REGISTRO DE CLIENTES CON MODALES
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

                // Validación de seguridad para teléfono (inicia con 9 y tiene 9 dígitos)
                if (!/^9[0-9]{8}$/.test(telefono)) {
                    return mostrarFeedback('advertencia', 'Teléfono Inválido', 'El número de teléfono debe comenzar con 9 y contener 9 dígitos numéricos.');
                }

                const { data: authData, error: authError } = await supabaseClient.auth.signUp({ email, password });

                if (authError) return mostrarFeedback('error', 'Error al Registrar', authError.message);

                if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                    return mostrarFeedback('advertencia', 'Correo en Uso', 'Este correo ya se encuentra registrado. Por favor, inicia sesión.');
                }

                if (authData.user) {
                    const { error: insertError } = await supabaseClient.from('clientes').insert([
                        { dni: dni, nombre_completo: nombre, correo: email, telefono: telefono }
                    ]);

                    if (insertError) {
                        if (insertError.message.includes('duplicate key') || insertError.code === '23505') {
                            mostrarFeedback('error', 'Datos Duplicados', 'El DNI o Correo ingresado ya existe en nuestra base de datos.');
                        } else {
                            mostrarFeedback('error', 'Error en Perfil', insertError.message);
                        }
                    } else {
                        await supabaseClient.auth.signOut(); 
                        mostrarFeedback('exito', '¡Cuenta Creada!', 'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.');
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
    // 5. CONTACTO & RESERVAS CON VALIDACIÓN DE FECHA
    // ==========================================
    const formContacto = document.getElementById('formContacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombreInput') ? document.getElementById('nombreInput').value.trim() : 'Cliente';
            const correo = document.getElementById('correoInput') ? document.getElementById('correoInput').value.trim().toLowerCase() : '';
            const telefono = document.getElementById('telefonoInput') ? document.getElementById('telefonoInput').value.trim() : '';
            const selectEvento = document.getElementById('tipoEvento');
            const tipoEvento = selectEvento ? selectEvento.options[selectEvento.selectedIndex].text : 'General';
            const fecha = document.getElementById('fechaInput') ? document.getElementById('fechaInput').value : null;
            const invitados = document.getElementById('invitadosInput') ? parseInt(document.getElementById('invitadosInput').value) : null;
            const detalles = document.getElementById('detallesInput') ? document.getElementById('detallesInput').value.trim() : '';

            // Bloqueo estricto de fechas pasadas
            if (fecha) {
                const fechaSeleccionada = new Date(fecha + 'T00:00:00');
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);

                if (fechaSeleccionada < hoy) {
                    return mostrarFeedback('advertencia', 'Fecha Inválida', 'No puedes reservar para una fecha pasada. Selecciona una fecha a partir de hoy.');
                }
            }

            // Validación estricta de teléfono en el envío
            if (!/^9[0-9]{8}$/.test(telefono)) {
                return mostrarFeedback('advertencia', 'Teléfono Inválido', 'El número de teléfono debe iniciar con 9 y contener 9 dígitos.');
            }

            const clienteIdInsert = (userRole === 'cliente' && profile) ? profile.id : null;

            const { error: insertError } = await supabaseClient.from('reservas').insert([{ 
                cliente_id: clienteIdInsert, 
                tipo_evento: tipoEvento, 
                fecha_tentativa: fecha, 
                cantidad_invitados: invitados, 
                detalles: `Nombre: ${nombre} | Correo: ${correo} | Teléfono: ${telefono} | Msj: ${detalles}`, 
                estado: 'Pendiente' 
            }]);

            if (insertError) {
                return mostrarFeedback('error', 'Error en Reserva', 'No se pudo registrar la solicitud: ' + insertError.message);
            }
            
            const numeroWhatsApp = '51937220742'; 
            const mensaje = `¡Hola INARA! Soy ${nombre}. Deseo cotizar un evento de tipo: *${tipoEvento}*.%0A%0A*Fecha:* ${fecha || 'Por coordinar'}%0A*Invitados:* ${invitados || 'Por coordinar'}%0A*Detalles:* ${detalles}%0A*Mi teléfono:* ${telefono}%0A*Mi correo:* ${correo}`;
            window.open(`https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`, '_blank');
            formContacto.reset();
        });
    }

    const tablaReservasBody = document.getElementById('tablaReservasBody');
    if (tablaReservasBody) {
        cargarServiciosAdmin();
        cargarReservasAdmin();
        cargarUsuariosAdmin();
        cargarExtrasAdmin(); 
        cargarProveedoresAdmin(); 
    }

    // ==========================================
    // 6. CRUD SERVICIOS (DAVID & NAYHA)
    // ==========================================
    const formCrudServicio = document.getElementById('formCrudServicio');
    if (formCrudServicio) {
        formCrudServicio.addEventListener('submit', async (e) => {
            e.preventDefault();
            const botonGuardar = formCrudServicio.querySelector('button[type="submit"]');
            if (botonGuardar.disabled) return;

            const id = document.getElementById('idServicioInput').value;
            const nombre = document.getElementById('nombreServInput').value.trim();
            const precio = Number(document.getElementById('precioServInput').value);
            const descripcion = document.getElementById('descServInput').value.trim();
            const fileInput = document.getElementById('imgServInput');
            let imagen_url = document.getElementById('imgServOculto').value;

            if (!nombre || !descripcion || !Number.isFinite(precio) || precio < 0) {
                return mostrarFeedback('advertencia', 'Datos Incompletos', 'Verifica el nombre, precio y descripción del servicio.');
            }

            if (fileInput.files.length > 0) {
                imagen_url = `./assets/img/${fileInput.files[0].name}`;
            }

            if (!imagen_url && !id) {
                return mostrarFeedback('advertencia', 'Imagen Requerida', 'Por favor selecciona una imagen para el servicio.');
            }

            botonGuardar.disabled = true;
            const textoOriginal = botonGuardar.textContent;
            botonGuardar.textContent = 'GUARDANDO...';

            try {
                let resultado;
                if (id) {
                    resultado = await supabaseClient.from('servicios')
                        .update({ nombre, precio, imagen_url, descripcion })
                        .eq('id', id)
                        .select('id');
                } else {
                    resultado = await supabaseClient.from('servicios')
                        .insert([{ nombre, precio, imagen_url, descripcion, estado: 'activo' }])
                        .select('id');
                }

                if (resultado.error) throw resultado.error;

                await cargarServiciosAdmin();
                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalServicio'));
                modal.hide();
                mostrarFeedback('exito', 'Servicio Guardado', id ? 'Servicio actualizado correctamente.' : 'Nuevo servicio registrado con éxito.');
            } catch (error) {
                console.error(error);
                mostrarFeedback('error', 'Error al Guardar', 'No se pudo guardar el servicio. Intenta nuevamente.');
            } finally {
                botonGuardar.disabled = false;
                botonGuardar.textContent = textoOriginal;
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
            const nombre = document.getElementById('nombreExtraInput').value.trim();
            const precio = parseFloat(document.getElementById('precioExtraInput').value);
            const descripcion = document.getElementById('descExtraInput').value.trim();

            let resError = null;
            if (id) {
                const { error } = await supabaseClient.from('extras').update({ nombre, precio_unitario: precio, descripcion }).eq('id', id);
                resError = error;
            } else {
                const { error } = await supabaseClient.from('extras').insert([{ nombre, precio_unitario: precio, descripcion }]);
                resError = error;
            }
            
            if (!resError) {
                document.querySelector('#modalExtra .btn-close').click();
                mostrarFeedback('exito', 'Extra Guardado', id ? 'Extra actualizado correctamente.' : 'Nuevo extra registrado.');
                cargarExtrasAdmin();
            } else {
                mostrarFeedback('error', 'Error al Guardar', resError.message);
            }
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
            const empresa = document.getElementById('empresaProvInput').value.trim();
            const contacto = document.getElementById('contactoProvInput').value.trim();
            const telefono = document.getElementById('telefonoProvInput').value.trim();
            const especialidad = document.getElementById('especialidadProvInput').value.trim();

            let resError = null;
            if (id) {
                const { error } = await supabaseClient.from('proveedores').update({ nombre_empresa: empresa, contacto, telefono, especialidad }).eq('id', id);
                resError = error;
            } else {
                const { error } = await supabaseClient.from('proveedores').insert([{ nombre_empresa: empresa, contacto, telefono, especialidad }]);
                resError = error;
            }
            
            if (!resError) {
                document.querySelector('#modalProveedor .btn-close').click();
                mostrarFeedback('exito', 'Proveedor Guardado', id ? 'Proveedor actualizado con éxito.' : 'Nuevo proveedor registrado.');
                cargarProveedoresAdmin();
            } else {
                mostrarFeedback('error', 'Error al Guardar', resError.message);
            }
        });
    }

    // ==========================================
    // 9. ACTUALIZACIÓN DE NOTAS / ESTADO RESERVA
    // ==========================================
    const formNotaReserva = document.getElementById('formNotaReserva');
    if (formNotaReserva) {
        formNotaReserva.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idReserva = document.getElementById('idReservaNotaInput').value;
            const nota = document.getElementById('notaReservaInput').value;
            const estadoNuevo = document.getElementById('estadoReservaSelect').value;

            const { error } = await supabaseClient.from('reservas').update({ nota_admin: nota, estado: estadoNuevo }).eq('id', idReserva);
            
            if (!error) {
                document.querySelector('#modalNotaReserva .btn-close').click();
                mostrarFeedback('exito', 'Solicitud Actualizada', 'Los cambios en la reserva fueron guardados.');
                cargarReservasAdmin(); 
            } else {
                mostrarFeedback('error', 'Error al Actualizar', error.message);
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
                        mostrarFeedback('advertencia', 'Cambio Parcial', 'El perfil fue copiado al nuevo rol, pero no se eliminó de la tabla origen por dependencias existentes.');
                    } else {
                        mostrarFeedback('exito', 'Rol Actualizado', 'El usuario fue transferido correctamente.');
                    }
                    document.querySelector('#modalEditarRol .btn-close').click();
                    cargarUsuariosAdmin(); 
                } else {
                    mostrarFeedback('error', 'Error de Traspaso', insertError.message);
                }
            }
        });
    }
}); 

// ==========================================================================
// FUNCIONES GLOBALES PARA EL DASHBOARD
// ==========================================================================
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

window.eliminarReserva = function(id) {
    confirmarAccionModal('¿Eliminar Solicitud?', 'Se eliminará permanentemente este registro de reserva.', async () => {
        await supabaseClient.from('reservas').delete().eq('id', id); 
        mostrarFeedback('exito', 'Registro Eliminado', 'La reserva fue retirada del panel.');
        cargarReservasAdmin(); 
    });
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
    const servicio = window.listaServiciosGlobal.find(s => String(s.id) === String(id));
    if (!servicio) return;

    const boton = Array.from(document.querySelectorAll('#tablaServiciosBody button'))
        .find(b => b.getAttribute('onclick') === `cambiarEstadoServicio(${id})`);
    if (!boton || boton.disabled) return;

    const nuevoEstado = servicio.estado === 'activo' ? 'inactivo' : 'activo';
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

        mostrarFeedback('exito', 'Estado Actualizado', `El servicio ahora está ${activo ? 'ACTIVO' : 'INACTIVO'}.`);
    } catch (error) {
        console.error(error);
        mostrarFeedback('error', 'Error al Actualizar', 'No se pudo cambiar el estado del servicio.');
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

window.eliminarServicio = function(id) {
    confirmarAccionModal('¿Eliminar Servicio?', 'El servicio seleccionado será eliminado del catálogo permanentemente.', async () => {
        await supabaseClient.from('servicios').delete().eq('id', id); 
        mostrarFeedback('exito', 'Servicio Eliminado', 'El servicio ha sido eliminado del sistema.');
        cargarServiciosAdmin(); 
    });
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

window.eliminarExtra = function(id) {
    confirmarAccionModal('¿Eliminar Extra?', 'Este adicional dejará de estar disponible para eventos.', async () => {
        await supabaseClient.from('extras').delete().eq('id', id); 
        mostrarFeedback('exito', 'Extra Eliminado', 'El servicio extra ha sido retirado.');
        cargarExtrasAdmin(); 
    });
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

window.eliminarProveedor = function(id) {
    confirmarAccionModal('¿Eliminar Proveedor?', 'El registro del proveedor y su contacto serán eliminados.', async () => {
        await supabaseClient.from('proveedores').delete().eq('id', id); 
        mostrarFeedback('exito', 'Proveedor Eliminado', 'El proveedor fue retirado del sistema.');
        cargarProveedoresAdmin(); 
    });
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

    if (window.listaAdminsGlobal.length === 0) tablaAdmin.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay administradores registrados.</td></tr>';
    else window.listaAdminsGlobal.forEach(per => renderUsuarioFila(per, tablaAdmin, 'admin'));

    if (window.listaClientesGlobal.length === 0) tablaCliente.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay clientes registrados.</td></tr>';
    else window.listaClientesGlobal.forEach(per => renderUsuarioFila(per, tablaCliente, 'cliente'));
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

window.eliminarUsuario = function(id, tipo) {
    confirmarAccionModal(`¿Eliminar ${tipo.toUpperCase()}?`, `Esta acción retirará permanentemente al usuario del sistema.`, async () => {
        const tabla = tipo === 'admin' ? 'administradores' : 'clientes';
        const { error } = await supabaseClient.from(tabla).delete().eq('id', id);
        if (!error) {
            mostrarFeedback('exito', 'Usuario Eliminado', `El ${tipo} ha sido retirado.`);
            cargarUsuariosAdmin();
        } else {
            mostrarFeedback('error', 'Error al Eliminar', error.message);
        }
    });
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
                mostrarFeedback('advertencia', 'Acceso Requerido', 'Debes iniciar sesión como cliente para poder dejar una reseña.');
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                return; 
            }

            const { data: perfilData } = await supabaseClient
                .from('clientes')
                .select('id, nombre_completo')
                .ilike('correo', session.user.email.trim().toLowerCase())
                .maybeSingle();

            if (!perfilData) {
                return mostrarFeedback('advertencia', 'Acceso Denegado', 'Solo los clientes registrados pueden publicar reseñas.');
            }

            const calificacion = document.getElementById('calificacionInput').value;
            const comentario = document.getElementById('comentarioResenaInput').value.trim();

            const { error } = await supabaseClient.from('resenas').insert([{ 
                cliente_id: perfilData.id, 
                calificacion: parseInt(calificacion), 
                comentario: comentario, 
                estado: 'aprobado' 
            }]);

            if (!error) {
                mostrarFeedback('exito', '¡Gracias por tu Reseña!', 'Tu testimonio ha sido publicado satisfactoriamente.');
                document.querySelector('#modalNuevaResena .btn-close').click();
                formNuevaResena.reset();
                cargarResenasPublicas(); 
            } else {
                mostrarFeedback('error', 'Error al Publicar', error.message);
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