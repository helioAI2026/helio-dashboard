import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import type { Severity } from "@/api/types";
import { useThresholds, useUpdateThresholds } from "@/api/queries";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEVERITY_CSS_VAR, SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/severity";

const schema = z
  .object({
    mild: z.number().int().min(1).max(97),
    drowsy: z.number().int().min(2).max(98),
    critical: z.number().int().min(3).max(99),
    notifyOn: z.enum(["alert", "mild", "drowsy", "critical"]),
    emailAlerts: z.boolean(),
    smsAlerts: z.boolean(),
  })
  .refine((d) => d.mild < d.drowsy && d.drowsy < d.critical, {
    message: "Os limiares devem ser crescentes: leve < sonolento < crítico.",
    path: ["critical"],
  });

type FormValues = z.infer<typeof schema>;

const MOCK_USERS = [
  { name: "Mateus Caxambu", email: "mateus@helio.app", role: "Administrador" },
  { name: "Central de Operações", email: "central@helio.app", role: "Operador" },
  { name: "Ana Ribeiro", email: "ana.ribeiro@helio.app", role: "Gestor de Frota" },
];

export function SettingsPage() {
  const thresholds = useThresholds();
  const update = useUpdateThresholds();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mild: 25,
      drowsy: 50,
      critical: 75,
      notifyOn: "drowsy",
      emailAlerts: true,
      smsAlerts: false,
    },
  });
  const { control, handleSubmit, reset, watch, formState } = form;

  useEffect(() => {
    if (thresholds.data) {
      reset({
        mild: thresholds.data.mild,
        drowsy: thresholds.data.drowsy,
        critical: thresholds.data.critical,
        notifyOn: thresholds.data.notifyOn,
        emailAlerts: thresholds.data.emailAlerts,
        smsAlerts: thresholds.data.smsAlerts,
      });
    }
  }, [thresholds.data, reset]);

  function onSubmit(values: FormValues) {
    update.mutate(values, {
      onSuccess: () => toast.success("Configurações salvas"),
    });
  }

  const values = watch();

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Limiares de alerta de fadiga, regras de notificação e usuários."
      />

      {thresholds.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Limiares de pontuação de fadiga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* live scale preview */}
              <div className="flex h-2.5 overflow-hidden rounded-full">
                <span
                  style={{
                    width: `${values.mild}%`,
                    background: SEVERITY_CSS_VAR.alert,
                  }}
                />
                <span
                  style={{
                    width: `${values.drowsy - values.mild}%`,
                    background: SEVERITY_CSS_VAR.mild,
                  }}
                />
                <span
                  style={{
                    width: `${values.critical - values.drowsy}%`,
                    background: SEVERITY_CSS_VAR.drowsy,
                  }}
                />
                <span
                  style={{
                    width: `${100 - values.critical}%`,
                    background: SEVERITY_CSS_VAR.critical,
                  }}
                />
              </div>

              {(["mild", "drowsy", "critical"] as const).map((key) => (
                <Controller
                  key={key}
                  control={control}
                  name={key}
                  render={({ field }) => (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>
                          Início de{" "}
                          <span
                            className="font-medium"
                            style={{ color: SEVERITY_CSS_VAR[key] }}
                          >
                            {key === "mild"
                              ? "fadiga leve"
                              : key === "drowsy"
                                ? "sonolência"
                                : "estado crítico"}
                          </span>
                        </span>
                        <span className="font-data tabular-nums">
                          {field.value}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                      />
                    </div>
                  )}
                />
              ))}

              {formState.errors.critical && (
                <p className="text-sm text-destructive">
                  {formState.errors.critical.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Regras de notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Notificar a partir de</p>
                  <p className="text-xs text-muted-foreground">
                    Nível mínimo de fadiga que dispara um alerta à central.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="notifyOn"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as Severity)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SEVERITY_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Alertas por e-mail</span>
                <Controller
                  control={control}
                  name="emailAlerts"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Alertas por SMS</span>
                <Controller
                  control={control}
                  name="smsAlerts"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </label>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={update.isPending || !formState.isDirty}>
              {update.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
            {formState.isDirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => thresholds.data && reset()}
              >
                Descartar
              </Button>
            )}
          </div>
        </form>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Usuários</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Função</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map((u) => (
                <TableRow key={u.email}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-data text-xs text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
