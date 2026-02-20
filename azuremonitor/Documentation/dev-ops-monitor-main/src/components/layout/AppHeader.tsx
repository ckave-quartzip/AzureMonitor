import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogOut, Settings, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import quartzLogo from '@/assets/quartz-logo.png';

export function AppHeader() {
  const { user, signOut, roles, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/clients', label: 'Clients' },
    { to: '/resources', label: 'Resources' },
    { to: '/azure', label: 'Azure' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/incidents', label: 'Incidents' },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <img src={quartzLogo} alt="Quartz IP Logo" className="h-9 w-9" />
                  <span className="text-sm font-semibold">Quartz IP Dev Ops</span>
                </div>
                
                {/* Navigation Links */}
                <nav className="flex-1 p-4">
                  <div className="flex flex-col gap-1">
                    {navLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={closeMobileMenu}
                        className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={closeMobileMenu}
                        className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Admin
                      </Link>
                    )}
                  </div>
                </nav>
                
                {/* User Info & Sign Out */}
                <div className="border-t p-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium truncate">{user?.email}</p>
                    <div className="flex gap-1 mt-1">
                      {roles.map((role) => (
                        <Badge key={role} variant="secondary" className="text-xs capitalize">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={signOut} className="w-full">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-3">
            <img src={quartzLogo} alt="Quartz IP Logo" className="h-9 w-9" />
            <span className="text-lg font-semibold hidden sm:inline">Quartz IP Dev Ops Monitoring System</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Settings className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.email}</p>
            <div className="flex gap-1 justify-end">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-xs capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={signOut} className="hidden sm:flex">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
