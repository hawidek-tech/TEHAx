import {
  Briefcase,
  Calendar,
  CircleHelp,
  Contact,
  FileText,
  GraduationCap,
  Handshake,
  IdCard,
  Languages,
  Lock,
  Mail,
  Map,
  MessageSquare,
  Phone,
  Shield,
  Star,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  user: User,
  contact: Contact,
  phone: Phone,
  mail: Mail,
  lock: Lock,
  shield: Shield,
  calendar: Calendar,
  map: Map,
  briefcase: Briefcase,
  text: FileText,
  school: GraduationCap,
  star: Star,
  language: Languages,
  id: IdCard,
  upload: Upload,
  handshake: Handshake,
  help: CircleHelp,
  message: MessageSquare,
  question: CircleHelp,
}

/** Explanatory icon shown NEXT TO text. Always decorative (aria-hidden); never the only label. */
export function FieldIcon({ name, size = 28 }: { name?: string; size?: number }) {
  const Icon = (name && ICONS[name]) || CircleHelp
  return (
    <span
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  )
}
