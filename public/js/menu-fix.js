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
    const pedidosPages = ['ventas.html', 'ventas-pendientes.html', 'historico-pedidos.html', 'hoja-rutas.html'];
    
    // Marcar el item activo del menú según la página actual y expandir menús padre
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
          // Asegurar que el submenú esté visible
          const submenu = parentMenu.querySelector('> ul.nav-treeview');
          if (submenu) {
            submenu.style.display = 'block';
          }
        }
      }
    });
    
    // Expandir menú de Pedidos si estamos en una página relacionada (fallback)
    if (pedidosPages.includes(currentPage)) {
      // Buscar específicamente el menú de Pedidos
      const allTreeviews = document.querySelectorAll('li.has-treeview');
      allTreeviews.forEach(menu => {
        const link = menu.querySelector('> a.nav-link');
        if (link && link.textContent.trim().includes('Pedidos')) {
          menu.classList.add('menu-open');
          link.classList.add('active');
          const submenu = menu.querySelector('> ul.nav-treeview');
          if (submenu) {
            submenu.style.display = 'block';
          }
        }
      });
    }
    
    // Función para asegurar que el menú de Pedidos muestre todos sus elementos
    function ensurePedidosMenuVisible() {
      const allTreeviews = document.querySelectorAll('li.has-treeview');
      allTreeviews.forEach(menu => {
        const link = menu.querySelector('> a.nav-link');
        if (link && link.textContent.trim().includes('Pedidos')) {
          const pedidosSubmenu = menu.querySelector('> ul.nav-treeview');
          if (pedidosSubmenu && menu.classList.contains('menu-open')) {
            pedidosSubmenu.style.display = 'block';
            // Asegurar que todos los elementos del submenú sean visibles
            const submenuItems = pedidosSubmenu.querySelectorAll('li.nav-item');
            submenuItems.forEach(item => {
              item.style.display = 'block';
              item.style.visibility = 'visible';
            });
          }
        }
      });
    }
    
    // Asegurar que todos los menús treeview funcionen correctamente
    $('li.has-treeview > a').off('click.menuFix').on('click.menuFix', function(e) {
      e.preventDefault();
      const $this = $(this);
      const $parent = $this.parent('li.has-treeview');
      const $treeview = $parent.find('> ul.nav-treeview');
      
      // Toggle del menú
      if ($parent.hasClass('menu-open')) {
        $treeview.slideUp(300);
        $parent.removeClass('menu-open');
      } else {
        $treeview.slideDown(300);
        $parent.addClass('menu-open');
        
        // Asegurar que todos los elementos del submenú sean visibles después de la animación
        setTimeout(function() {
          $treeview.find('li.nav-item').css({
            'display': 'block',
            'visibility': 'visible'
          });
          
          // Verificar específicamente el menú de Pedidos
          if ($this.text().trim().includes('Pedidos')) {
            ensurePedidosMenuVisible();
          }
        }, 350);
      }
    });
    
    // Asegurar visibilidad inicial y después de cambios en el DOM
    setTimeout(ensurePedidosMenuVisible, 100);
    setTimeout(ensurePedidosMenuVisible, 500);
    
    // Observar cambios en el DOM para detectar cuando se abre el menú de Pedidos
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(function(mutations) {
        let shouldCheck = false;
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            shouldCheck = true;
          }
          if (mutation.type === 'childList') {
            shouldCheck = true;
          }
        });
        if (shouldCheck) {
          setTimeout(ensurePedidosMenuVisible, 50);
        }
      });
      
      // Observar cambios en los menús treeview
      document.querySelectorAll('li.has-treeview').forEach(menu => {
        observer.observe(menu, { 
          attributes: true, 
          attributeFilter: ['class'],
          childList: true,
          subtree: true
        });
      });
    }
  }
  
  // Ejecutar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
  } else {
    initMenu();
  }
})();

