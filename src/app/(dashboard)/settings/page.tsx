"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  User,
  Building2,
  Mail,
  MapPin,
  Loader2,
  Save,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const profileSchema = z.object({
  company_name: z.string().min(2, "Company name is required"),
  contact_person: z.string().min(2, "Contact person is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  vat_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  email: string;
  role: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  is_approved: boolean;
  created_at: string;
}

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
        reset({
          company_name: data.company_name,
          contact_person: data.contact_person || "",
          email: data.email,
          phone: data.phone || "",
          vat_number: data.vat_number || "",
          address: data.address || "",
          city: data.city || "",
          province: data.province || "",
          postal_code: data.postal_code || "",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!profile) return;
    
    setSaving(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: data.company_name,
          contact_person: data.contact_person,
          phone: data.phone || null,
          vat_number: data.vat_number || null,
          address: data.address || null,
          city: data.city || null,
          province: data.province || null,
          postal_code: data.postal_code || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile) return;

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error("Failed to send reset email");
    } else {
      toast.success("Password reset email sent!");
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!profile) return null;

  const roleLabels: Record<string, string> = {
    admin: "Administrator",
    buyer: "Buyer",
    supplier: "Supplier",
    transporter: "Transporter",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and account preferences
        </p>
      </div>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium">{roleLabels[profile.role] || profile.role}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className={`font-medium ${profile.is_approved ? "text-green-600" : "text-amber-600"}`}>
                {profile.is_approved ? "Approved" : "Pending Approval"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              Company Information
            </CardTitle>
            <CardDescription>
              Your business details visible on documents and communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  {...register("company_name")}
                  disabled={saving}
                />
                {errors.company_name && (
                  <p className="text-sm text-destructive">{errors.company_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat_number">VAT Number</Label>
                <Input
                  id="vat_number"
                  placeholder="4123456789"
                  {...register("vat_number")}
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  {...register("contact_person")}
                  disabled={saving}
                />
                {errors.contact_person && (
                  <p className="text-sm text-destructive">{errors.contact_person.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+27 XX XXX XXXX"
                  {...register("phone")}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                disabled={true}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email address
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Business Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main Road"
                {...register("address")}
                disabled={saving}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Cape Town"
                  {...register("city")}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Select
                  defaultValue={profile.province || ""}
                  onValueChange={(value) => setValue("province", value, { shouldDirty: true })}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  placeholder="8001"
                  {...register("postal_code")}
                  disabled={saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !isDirty}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>
            Manage your password and account security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handlePasswordReset}>
            <Mail className="mr-2 h-4 w-4" />
            Send Password Reset Email
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

