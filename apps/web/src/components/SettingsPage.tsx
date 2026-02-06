/**
 * Settings Page Component
 * Complete settings interface with Profile, Billing, Notifications, and more
 */
import * as React from "react"
import { useState } from "react"
import {
  User,
  CreditCard,
  Bell,
  Palette,
  Shield,
  Building2,
  ChevronDown,
  ChevronRight,
  Check,
  Mail,
  Phone,
  MapPin,
  Clock,
  Globe,
  Moon,
  Sun,
  Smartphone,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface SettingsPageProps {
  appName?: string
  primaryColor?: string
}

interface SettingsSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function SettingsSection({ title, description, icon, children, defaultOpen = false }: SettingsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-6" />
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

export function SettingsPage({ appName = "My App", primaryColor = "#059669" }: SettingsPageProps) {
  // State for settings values
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    phone: "(555) 123-4567",
  })
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  })
  
  const [appearance, setAppearance] = useState({
    theme: "light",
    language: "en",
    timezone: "America/New_York",
  })
  
  const [billing, setBilling] = useState({
    plan: "pro",
    cardLast4: "4242",
    cardBrand: "Visa",
    nextBilling: "Feb 15, 2026",
    amount: "$29.00",
  })

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-2">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and app preferences</p>
      </div>

      {/* Profile Section */}
      <SettingsSection
        title="Profile"
        description="Your personal information and account details"
        icon={<User className="h-5 w-5" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div>
              <Button variant="outline" size="sm">Change Photo</Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <Button variant="outline">Change Password</Button>
            <Button>Save Changes</Button>
          </div>
        </div>
      </SettingsSection>

      {/* Business Information */}
      <SettingsSection
        title="Business Information"
        description="Your business details and branding"
        icon={<Building2 className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" defaultValue={appName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input id="businessPhone" defaultValue="(555) 987-6543" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="businessAddress">Address</Label>
              <Input id="businessAddress" defaultValue="123 Main Street, Suite 100" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" defaultValue="New York" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input id="zipCode" defaultValue="10001" />
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <Label>Business Hours</Label>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span>Monday - Friday</span>
                <span className="text-muted-foreground">9:00 AM - 6:00 PM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span>Saturday</span>
                <span className="text-muted-foreground">10:00 AM - 4:00 PM</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span>Sunday</span>
                <span className="text-muted-foreground">Closed</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-2">Edit Hours</Button>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button>Save Changes</Button>
          </div>
        </div>
      </SettingsSection>

      {/* Billing & Subscription */}
      <SettingsSection
        title="Billing & Subscription"
        description="Manage your subscription and payment methods"
        icon={<CreditCard className="h-5 w-5" />}
      >
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-lg">Pro Plan</h4>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">Current</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">$29/month • Billed monthly</p>
              </div>
              <Button variant="outline">Change Plan</Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Unlimited apps
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Priority support
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Advanced analytics
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" />
                Custom branding
              </div>
            </div>
          </div>
          
          {/* Payment Method */}
          <div>
            <h4 className="font-medium mb-3">Payment Method</h4>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-muted">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{billing.cardBrand} •••• {billing.cardLast4}</p>
                  <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Update</Button>
            </div>
          </div>
          
          {/* Next Payment */}
          <div>
            <h4 className="font-medium mb-3">Next Payment</h4>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{billing.amount}</p>
                <p className="text-sm text-muted-foreground">Due on {billing.nextBilling}</p>
              </div>
              <Button variant="outline" size="sm">View Invoices</Button>
            </div>
          </div>
          
          {/* Billing History */}
          <div>
            <h4 className="font-medium mb-3">Recent Invoices</h4>
            <div className="space-y-2">
              {[
                { date: "Jan 15, 2026", amount: "$29.00", status: "Paid" },
                { date: "Dec 15, 2025", amount: "$29.00", status: "Paid" },
                { date: "Nov 15, 2025", amount: "$29.00", status: "Paid" },
              ].map((invoice, i) => (
                <div key={i} className="flex items-center justify-between p-2 text-sm">
                  <span>{invoice.date}</span>
                  <span>{invoice.amount}</span>
                  <span className="text-green-600">{invoice.status}</span>
                  <Button variant="ghost" size="sm">Download</Button>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <Button variant="destructive" variant="outline" className="text-destructive">
              Cancel Subscription
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications"
        description="Choose how you want to be notified"
        icon={<Bell className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
              </div>
            </div>
            <Switch
              checked={notifications.push}
              onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Receive text messages for important alerts</p>
              </div>
            </div>
            <Switch
              checked={notifications.sms}
              onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-muted-foreground">Receive tips, updates, and offers</p>
              </div>
            </div>
            <Switch
              checked={notifications.marketing}
              onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize how the app looks"
        icon={<Palette className="h-5 w-5" />}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Smartphone },
              ].map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => setAppearance({ ...appearance, theme: theme.value })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    appearance.theme === theme.value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <theme.icon className="h-5 w-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">{theme.label}</p>
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={appearance.language} onValueChange={(v) => setAppearance({ ...appearance, language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={appearance.timezone} onValueChange={(v) => setAppearance({ ...appearance, timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Privacy & Security */}
      <SettingsSection
        title="Privacy & Security"
        description="Manage your data and security settings"
        icon={<Shield className="h-5 w-5" />}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium">Export Your Data</p>
              <p className="text-sm text-muted-foreground">Download a copy of your data</p>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
          
          <Separator />
          
          <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <h4 className="font-medium text-destructive">Danger Zone</h4>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="destructive" size="sm">Delete Account</Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}

export default SettingsPage
