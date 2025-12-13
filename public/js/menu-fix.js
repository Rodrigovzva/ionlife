/**
 * Script para asegurar que el menú lateral funcione correctamente
 * Se ejecuta en todas las páginas para mantener el estado del menú
 */

(function() {
  'use strict';
  
  function initMenu() {
    // Esperar a que jQuery y AdminLTE estén cargados
    if (typeof $ === 'undefined' || typeof $.fn.treeview === 'undefined') {
      setTimeout(initMenu, 100);
      return;
    }
    
    // Inicializar treeview de AdminLTE
    try {
      $('[data-widget="treeview"]').Treeview('init');
    } catch (e) {
      console.warn('Error al inicializar treeview:', e);
    }
    
    // Obtener la página actual
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const pedidosPages = ['ventas.html', 'ventas-pendientes.html'];
    
    // Expandir menú de Pedidos si estamos en una página relacionada
    if (pedidosPages.includes(currentPage)) {
      const pedidosMenu = document.querySelector('li.has-treeview');
      if (pedidosMenu) {
        pedidosMenu.classList.add('menu-open');
        const link = pedidosMenu.querySelector('> a.nav-link');
        if (link) {
          link.classList.add('active');
        }
      }
    }
    
    // Marcar el item activo del menú según la página actual
    const navLinks = document.querySelectorAll('.nav-link[href]');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
        // Si está dentro de un submenú, expandir el menú padre
        const parentMenu = link.closest('li.has-treeview');
        if (parentMenu) {
          parentMenu.classList.add('menu-open');
          const parentLink = parentMenu.querySelector('> a.nav-link');
          if (parentLink) {
            parentLink.classList.add('active');
          }
        }
      }
    });
    
    // Asegurar que todos los menús treeview funcionen correctamente
    $('li.has-treeview > a').on('click', function(e) {
      e.preventDefault();
      const $this = $(this);
      const $parent = $this.parent('li.has-treeview');
      const $treeview = $parent.find('> ul.nav-treeview');
      
      // Toggle del menú
      if ($parent.hasClass('menu-open')) {
        $treeview.slideUp(300);
        $parent.removeClass('menu-open');
      } else {
        // Cerrar otros menús abiertos (opcional, comentado para permitir múltiples abiertos)
        // $('li.has-treeview.menu-open').find('> ul.nav-treeview').slideUp(300);
        // $('li.has-treeview.menu-open').removeClass('menu-open');
        
        $treeview.slideDown(300);
        $parent.addClass('menu-open');
      }
    });
  }
  
  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
  } else {
    initMenu();
  }
})();

