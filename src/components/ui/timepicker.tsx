import * as React from "react"
import { Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function TimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value)

  const handleTimeChange = (newTime: string) => {
    setInternalValue(newTime)
  }

  const handleSave = () => {
    const [hours, minutes] = internalValue.split(':')
    const hoursInt = parseInt(hours, 10)
    const isPM = hoursInt >= 12
    const adjustedHours = hoursInt % 12 || 12
    const formattedTime = `${adjustedHours}:${minutes} ${isPM ? 'PM' : 'AM'}`
    onChange(formattedTime)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || "Pick a time"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          <Input
            type="time"
            value={internalValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full"
          />
          <Button onClick={handleSave} className="mt-2 w-full">Set Time</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

