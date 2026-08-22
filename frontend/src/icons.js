import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  Database,
  ExternalLink,
  FolderKanban,
  Info,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Star,
  Sun,
  UserRoundPlus,
  X,
  createElement,
} from 'lucide';

const ICONS = {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  Database,
  ExternalLink,
  FolderKanban,
  Info,
  LayoutDashboard,
  Moon,
  Plus,
  Search,
  Star,
  Sun,
  UserRoundPlus,
  X,
};

/**
 * Retourne une icône Lucide homogène, décorative par défaut.
 * Les libellés accessibles restent portés par les boutons et les liens.
 */
function icon(name, className = 'ui-icon') {
  const definition = ICONS[name];
  if (!definition) return '';

  return createElement(definition, {
    class: className,
    'aria-hidden': 'true',
    focusable: 'false',
  }).outerHTML;
}

function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((slot) => {
    slot.innerHTML = icon(slot.dataset.icon, slot.dataset.iconClass || 'ui-icon');
  });
}

globalThis.icon = icon;
globalThis.mountIcons = mountIcons;

document.addEventListener('DOMContentLoaded', () => mountIcons());
