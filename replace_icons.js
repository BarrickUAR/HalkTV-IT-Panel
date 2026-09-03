const fs = require('fs');
const path = require('path');

const ICON_MAP = {
  "SearchIcon": "HiOutlineMagnifyingGlass",
  "BellIcon": "HiOutlineBell",
  "MessageCircleIcon": "HiOutlineChatBubbleLeftEllipsis",
  "ArrowLeftIcon": "HiOutlineArrowLeft",
  "SendIcon": "HiOutlinePaperAirplane",
  "XIcon": "HiOutlineXMark",
  "MegaphoneIcon": "HiOutlineSpeakerWave",
  "BarChart3Icon": "HiOutlineChartBarSquare",
  "BookOpenIcon": "HiOutlineBookOpen",
  "BoxesIcon": "HiOutlineCube",
  "CalendarIcon": "HiOutlineCalendar",
  "ClockIcon": "HiOutlineClock",
  "KeyRoundIcon": "HiOutlineKey",
  "LaptopIcon": "HiOutlineComputerDesktop",
  "LayoutDashboardIcon": "HiOutlineSquares2X2",
  "LayoutGridIcon": "HiOutlineViewColumns",
  "MapPinIcon": "HiOutlineMapPin",
  "PackageIcon": "HiOutlineArchiveBox",
  "SettingsIcon": "HiOutlineCog8Tooth",
  "TicketIcon": "HiOutlineTicket",
  "UsersIcon": "HiOutlineUsers",
  "WrenchIcon": "HiOutlineWrenchScrewdriver",
  "StarIcon": "HiOutlineStar",
  "MailIcon": "HiOutlineEnvelope",
  "PhoneIcon": "HiOutlinePhone",
  "HashIcon": "HiOutlineHashtag",
  "Building2Icon": "HiOutlineBuildingOffice2",
  "UserIcon": "HiOutlineUser",
  "CheckIcon": "HiOutlineCheck",
  "InfoIcon": "HiOutlineInformationCircle",
  "AlertTriangleIcon": "HiOutlineExclamationTriangle",
  "FileIcon": "HiOutlineDocument",
  "ChevronRightIcon": "HiOutlineChevronRight",
  "ChevronDownIcon": "HiOutlineChevronDown",
  "ChevronLeftIcon": "HiOutlineChevronLeft",
  "ChevronUpIcon": "HiOutlineChevronUp",
  "MoreHorizontalIcon": "HiOutlineEllipsisHorizontal",
  "MoreVerticalIcon": "HiOutlineEllipsisVertical",
  "TrashIcon": "HiOutlineTrash",
  "EditIcon": "HiOutlinePencil",
  "PlusIcon": "HiOutlinePlus",
  "LogOutIcon": "HiOutlineArrowRightOnRectangle",
  "DownloadIcon": "HiOutlineArrowDownTray",
  "MonitorIcon": "HiOutlineComputerDesktop",
  "MoonIcon": "HiOutlineMoon",
  "SunIcon": "HiOutlineSun",
  "CircleCheckIcon": "HiOutlineCheckCircle",
  "TriangleAlertIcon": "HiOutlineExclamationTriangle",
  "OctagonXIcon": "HiOutlineXCircle",
  "Loader2Icon": "HiOutlineArrowPath",
  "LucideIcon": "IconType" // from react-icons
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace Lucide imports
  const lucideImportRegex = /import\s+{([\s\S]+?)}\s+from\s+['"]lucide-react['"];?/g;
  content = content.replace(lucideImportRegex, (match, importsStr) => {
    changed = true;
    const imports = importsStr.split(',').map(i => i.trim()).filter(Boolean);
    const newImports = [];
    let hasIconType = false;
    
    imports.forEach(imp => {
      const isType = imp.startsWith('type ');
      const name = isType ? imp.replace('type ', '') : imp;
      
      if (name === 'LucideIcon') {
        hasIconType = true;
      } else if (ICON_MAP[name]) {
        newImports.push(ICON_MAP[name]);
      } else {
        console.warn(`Unmapped icon: ${name} in ${filePath}`);
      }
    });

    let newImportLine = '';
    if (newImports.length > 0) {
      newImportLine += `import { ${newImports.join(', ')} } from "react-icons/hi2";\n`;
    }
    if (hasIconType) {
      newImportLine += `import type { IconType } from "react-icons";\n`;
    }
    return newImportLine.trim();
  });

  // Replace usages in code
  Object.keys(ICON_MAP).forEach(oldIcon => {
    if (content.includes(oldIcon)) {
      const regex = new RegExp(`\\b${oldIcon}\\b`, 'g');
      content = content.replace(regex, ICON_MAP[oldIcon]);
      changed = true;
    }
  });

  // Remove gradients, glows, and blurs
  const replacers = [
    { from: /bg-gradient-to-r from-red-600 to-red-500/g, to: "bg-primary" },
    { from: /shadow-xl shadow-red-500\/30/g, to: "shadow-md" },
    { from: /hover:shadow-2xl hover:shadow-red-500\/40/g, to: "hover:shadow-lg" },
    { from: /border-white\/10 bg-gradient-to-r from-slate-900 to-slate-800/g, to: "border-border bg-muted/80" },
    { from: /shadow-2xl/g, to: "shadow-lg" },
    { from: /bg-gradient-to-r from-slate-900 to-slate-800/g, to: "bg-muted" },
    { from: /backdrop-blur-sm bg-background\/80/g, to: "bg-background" },
    { from: /backdrop-blur/g, to: "" },
  ];

  replacers.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src'));
