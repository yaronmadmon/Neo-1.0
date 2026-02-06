/**
 * Schedule Calendar Component
 * A proper scheduling calendar view with day/week/month views
 */
import * as React from "react"
import { useState, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  endTime?: string
  type?: string
  status?: string
  customer?: string
  location?: string
  color?: string
}

interface ScheduleCalendarProps {
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onAddEvent?: (date: Date) => void
  primaryColor?: string
}

type ViewMode = 'month' | 'week' | 'day'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

// Sample events for demo
const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Team Meeting', date: '2026-02-05', time: '09:00', endTime: '10:00', type: 'meeting', status: 'confirmed', color: '#3b82f6' },
  { id: '2', title: 'Client Call - Smith', date: '2026-02-05', time: '14:00', endTime: '15:00', customer: 'John Smith', type: 'call', status: 'confirmed', color: '#10b981' },
  { id: '3', title: 'Project Review', date: '2026-02-06', time: '11:00', endTime: '12:00', type: 'meeting', status: 'pending', color: '#f59e0b' },
  { id: '4', title: 'Lunch with Team', date: '2026-02-07', time: '12:30', endTime: '13:30', location: 'Downtown Cafe', type: 'event', color: '#8b5cf6' },
  { id: '5', title: 'Product Demo', date: '2026-02-10', time: '15:00', endTime: '16:00', customer: 'Acme Corp', type: 'demo', status: 'confirmed', color: '#ec4899' },
  { id: '6', title: 'Weekly Standup', date: '2026-02-12', time: '09:30', endTime: '10:00', type: 'meeting', status: 'recurring', color: '#3b82f6' },
  { id: '7', title: 'Training Session', date: '2026-02-14', time: '14:00', endTime: '16:00', type: 'training', color: '#06b6d4' },
]

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  // Add days from previous month to start on Sunday
  const startDay = firstDay.getDay()
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(d)
  }
  
  // Add all days of current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  
  // Add days from next month to complete the grid
  const remaining = 42 - days.length // 6 rows * 7 days
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i))
  }
  
  return days
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function isToday(date: Date): boolean {
  const today = new Date()
  return formatDate(date) === formatDate(today)
}

function isSameMonth(date: Date, currentMonth: number): boolean {
  return date.getMonth() === currentMonth
}

export function ScheduleCalendar({ 
  events = SAMPLE_EVENTS, 
  onEventClick, 
  onAddEvent,
  primaryColor = '#059669'
}: ScheduleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  const days = useMemo(() => getDaysInMonth(year, month), [year, month])
  
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(event => {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    })
    return map
  }, [events])
  
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }
  
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }
  
  const selectedDateEvents = selectedDate 
    ? eventsByDate[formatDate(selectedDate)] || []
    : []

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Calendar */}
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold ml-2">
                  {MONTHS[month]} {year}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <div className="flex rounded-md border">
                  {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-3 py-1 text-sm capitalize transition-colors ${
                        viewMode === mode 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <Button size="sm" onClick={() => onAddEvent?.(selectedDate || new Date())}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {/* Day headers */}
              {DAYS.map(day => (
                <div key={day} className="bg-muted/50 py-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Day cells */}
              {days.map((date, i) => {
                const dateStr = formatDate(date)
                const dayEvents = eventsByDate[dateStr] || []
                const isCurrentMonth = isSameMonth(date, month)
                const isTodayDate = isToday(date)
                const isSelected = selectedDate && formatDate(selectedDate) === dateStr
                
                return (
                  <div
                    key={i}
                    onClick={() => handleDateClick(date)}
                    className={`
                      min-h-[100px] p-1 bg-background cursor-pointer transition-colors
                      ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''}
                      ${isSelected ? 'ring-2 ring-primary ring-inset' : 'hover:bg-muted/50'}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                      ${isTodayDate ? 'bg-primary text-primary-foreground' : ''}
                    `}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(event)
                          }}
                          className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: event.color || primaryColor, color: 'white' }}
                        >
                          {event.time && <span className="font-medium">{event.time} </span>}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Sidebar - Selected Day Events */}
        <Card className="w-full lg:w-80">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate 
                ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No events scheduled</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => onAddEvent?.(selectedDate || new Date())}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Event
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-1 h-full min-h-[40px] rounded-full"
                        style={{ backgroundColor: event.color || primaryColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{event.title}</h4>
                        {event.time && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {event.time}{event.endTime && ` - ${event.endTime}`}
                          </p>
                        )}
                        {event.customer && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {event.customer}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </p>
                        )}
                        {event.status && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {event.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming Events Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {events.slice(0, 4).map(event => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: event.color || primaryColor }}
                  />
                  <span className="text-sm text-muted-foreground">{event.date}</span>
                </div>
                <h4 className="font-medium text-sm truncate">{event.title}</h4>
                {event.time && (
                  <p className="text-xs text-muted-foreground mt-1">{event.time}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ScheduleCalendar
