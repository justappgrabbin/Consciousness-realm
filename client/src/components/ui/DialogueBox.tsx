import { useEffect } from "react";
import { useNPCs } from "../../lib/stores/useNPCs";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import { MessageCircle, X } from "lucide-react";

export default function DialogueBox() {
  const { activeNPC, currentDialogue, endInteraction, nextDialogue } = useNPCs();
  const { activeField } = useConsciousness();
  
  // Handle ESC key to close dialogue
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && activeNPC) {
        endInteraction();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeNPC, endInteraction]);
  
  if (!activeNPC || !currentDialogue) return null;
  
  const npc = useNPCs((state) => state.npcs.find(n => n.id === activeNPC));
  
  if (!npc) return null;
  
  return (
    <div className="fixed bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[calc(100%-1rem)] sm:w-full max-w-2xl px-2 sm:px-4">
      <Card className="bg-black/90 border-2 border-yellow-500 text-white backdrop-blur-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mt-1 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-yellow-500 text-sm sm:text-base truncate">{npc.name}</h3>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="text-xs px-1.5 sm:px-2 py-1 bg-blue-900/50 rounded hidden sm:inline">
                    {activeField} resonance
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={endInteraction}
                    className="text-white hover:bg-white/20 h-8 w-8 sm:h-6 sm:w-6 p-0 min-h-[44px] sm:min-h-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-gray-200 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">
                {currentDialogue}
              </p>
              
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">
                  Press E to continue • ESC to end conversation
                </span>
                <span className="text-xs text-gray-400 sm:hidden">
                  Tap to continue
                </span>
                
                <Button
                  size="sm"
                  onClick={() => nextDialogue(activeField)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-black min-h-[44px] sm:min-h-0 px-4"
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
