import {
  Home, GraduationCap, HeartPulse, Lightbulb, Smartphone, Landmark, Car,
  CreditCard, Repeat, Gamepad2, Tag, HandCoins, FileText, AlertTriangle,
} from "lucide-react-native";

/* lucide-react-native expoe os mesmos nomes de lucide-react, entao a string do
   catalogo serve aos dois lados — so esta tabela de traducao e especifica. */
const ICONS = {
  Home, GraduationCap, HeartPulse, Lightbulb, Smartphone, Landmark, Car,
  CreditCard, Repeat, Gamepad2, Tag, HandCoins, FileText, AlertTriangle,
};

export const iconFor = (name) => ICONS[name] || Tag;
