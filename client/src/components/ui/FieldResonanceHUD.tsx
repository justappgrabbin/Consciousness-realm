import { useConsciousness } from "../../lib/stores/useConsciousness";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Progress } from "./progress";

export default function FieldResonanceHUD() {
  const { activeField, getActiveField, switchCooldown, lastSwitchTime } = useConsciousness();
  
  const field = getActiveField();
  const now = Date.now();
  const timeUntilSwitch = Math.max(0, switchCooldown - (now - lastSwitchTime));
  const cooldownProgress = ((switchCooldown - timeUntilSwitch) / switchCooldown) * 100;
  
  if (!field) return null;
  
  return (
    <div className="fixed top-2 left-2 md:top-4 md:left-4 z-40 w-[calc(100vw-1rem)] sm:w-auto max-w-sm">
      <Card className="bg-black/80 border-2 text-white backdrop-blur-sm" style={{ borderColor: field.color }}>
        <CardContent className="p-2 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: field.color, boxShadow: `0 0 10px ${field.color}` }}
            />
            <h2 className="text-sm sm:text-lg font-bold truncate">{field.name} Field</h2>
            <Badge variant="secondary" className="text-xs">Lv {field.level}</Badge>
          </div>
          
          <p className="text-xs sm:text-sm text-gray-300 mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-none">{field.description}</p>
          
          {/* Field Experience */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Field XP</span>
              <span>{field.experience}/100</span>
            </div>
            <Progress value={(field.experience % 100)} className="h-2" />
          </div>
          
          {/* Switch Cooldown */}
          {timeUntilSwitch > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Field Switch Cooldown</span>
                <span>{Math.ceil(timeUntilSwitch / 1000)}s</span>
              </div>
              <Progress value={cooldownProgress} className="h-2" />
            </div>
          )}
          
          {/* Active Traits Count */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>Active Traits</span>
            <span>{field.traits.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
