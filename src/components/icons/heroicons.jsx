import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  BeakerIcon,
  BoltIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
  CubeTransparentIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FingerPrintIcon,
  GlobeAltIcon,
  HandRaisedIcon,
  InformationCircleIcon,
  LightBulbIcon,
  LockClosedIcon,
  MagnifyingGlassCircleIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PhotoIcon,
  PresentationChartLineIcon,
  ShareIcon,
  ShieldExclamationIcon,
  SignalIcon,
  SparklesIcon,
  Squares2X2Icon,
  TagIcon,
  ViewfinderCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

function createHeroIcon(HeroIcon) {
  function Icon({ size = 24, strokeWidth = 1.5, ...props }) {
    return <HeroIcon width={size} height={size} strokeWidth={strokeWidth} {...props} />
  }

  Icon.displayName = HeroIcon.displayName || HeroIcon.name
  return Icon
}

export const Accessibility = createHeroIcon(HandRaisedIcon)
export const AlertCircle = createHeroIcon(ExclamationCircleIcon)
export const AlertTriangle = createHeroIcon(ExclamationTriangleIcon)
export const ArrowRight = createHeroIcon(ArrowRightIcon)
export const Bot = createHeroIcon(CpuChipIcon)
export const Boxes = createHeroIcon(CubeTransparentIcon)
export const ChartNoAxesCombined = createHeroIcon(PresentationChartLineIcon)
export const Check = createHeroIcon(CheckIcon)
export const CheckCircle2 = createHeroIcon(CheckCircleIcon)
export const ChevronDown = createHeroIcon(ChevronDownIcon)
export const CircleCheck = createHeroIcon(CheckCircleIcon)
export const Clipboard = createHeroIcon(ClipboardDocumentIcon)
export const Clock = createHeroIcon(ClockIcon)
export const Code2 = createHeroIcon(CodeBracketIcon)
export const CodeXml = createHeroIcon(CodeBracketSquareIcon)
export const Crosshair = createHeroIcon(ViewfinderCircleIcon)
export const Diamond = createHeroIcon(TagIcon)
export const Download = createHeroIcon(ArrowDownTrayIcon)
export const ExternalLink = createHeroIcon(ArrowTopRightOnSquareIcon)
export const Eye = createHeroIcon(EyeIcon)
export const FileCode2 = createHeroIcon(CodeBracketSquareIcon)
export const FileSearch = createHeroIcon(DocumentMagnifyingGlassIcon)
export const FileText = createHeroIcon(DocumentTextIcon)
export const Files = createHeroIcon(ClipboardDocumentIcon)
export const Fingerprint = createHeroIcon(FingerPrintIcon)
export const FlaskConical = createHeroIcon(BeakerIcon)
export const Globe2 = createHeroIcon(GlobeAltIcon)
export const Image = createHeroIcon(PhotoIcon)
export const Info = createHeroIcon(InformationCircleIcon)
export const LayoutGrid = createHeroIcon(Squares2X2Icon)
export const Lightbulb = createHeroIcon(LightBulbIcon)
export const ListChecks = createHeroIcon(ClipboardDocumentCheckIcon)
export const LockKeyhole = createHeroIcon(LockClosedIcon)
export const MessageSquareText = createHeroIcon(ChatBubbleLeftRightIcon)
export const Minus = createHeroIcon(MinusIcon)
export const Network = createHeroIcon(ShareIcon)
export const PanelLeftClose = createHeroIcon(Bars3BottomLeftIcon)
export const PanelLeftOpen = createHeroIcon(Bars3Icon)
export const Prompt = createHeroIcon(ChatBubbleBottomCenterTextIcon)
export const Quote = createHeroIcon(ChatBubbleBottomCenterTextIcon)
export const Radar = createHeroIcon(SignalIcon)
export const RefreshCw = createHeroIcon(ArrowPathIcon)
export const RotateCw = createHeroIcon(ArrowPathIcon)
export const ScanLine = createHeroIcon(ViewfinderCircleIcon)
export const ScanSearch = createHeroIcon(MagnifyingGlassCircleIcon)
export const Search = createHeroIcon(MagnifyingGlassIcon)
export const Settings = createHeroIcon(AdjustmentsHorizontalIcon)
export const Share2 = createHeroIcon(ShareIcon)
export const ShieldAlert = createHeroIcon(ShieldExclamationIcon)
export const ShieldX = createHeroIcon(ShieldExclamationIcon)
export const SlidersHorizontal = createHeroIcon(AdjustmentsHorizontalIcon)
export const Sparkles = createHeroIcon(SparklesIcon)
export const TriangleAlert = createHeroIcon(ExclamationTriangleIcon)
export const Waypoints = createHeroIcon(ShareIcon)
export const X = createHeroIcon(XMarkIcon)
export const Zap = createHeroIcon(BoltIcon)
export const Binary = createHeroIcon(CpuChipIcon)
