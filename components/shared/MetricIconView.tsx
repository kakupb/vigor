// components/shared/MetricIconView.tsx
import { MetricIcon } from "@/store/healthMetricsStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  icon: MetricIcon;
  size?: number;
  color?: string; // optional override, sonst metric.color
};

export function MetricIconView({ icon, size = 20, color }: Props) {
  if (icon.lib === "mci") {
    return (
      <MaterialCommunityIcons
        name={icon.name as any}
        size={size}
        color={color}
      />
    );
  }
  return <Ionicons name={icon.name as any} size={size} color={color} />;
}
