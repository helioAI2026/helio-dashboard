import { useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Gauge,
  Truck,
  Users,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import type { Severity } from "@/api/types";
import { SEVERITY_ORDER } from "@/lib/severity";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/common/StatCard";
import { SeverityPill } from "@/components/common/SeverityPill";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Sparkline } from "@/components/charts/Sparkline";
import { DrowsinessGauge } from "@/components/charts/DrowsinessGauge";
import { ScoreTimeSeries } from "@/components/charts/ScoreTimeSeries";
import { SeverityBreakdownBar } from "@/components/charts/SeverityBreakdownBar";

const SPARK = [12, 15, 11, 18, 22, 19, 27, 24, 31, 28, 35, 30];
const TREND = Array.from({ length: 48 }, (_, i) => ({
  t: new Date(Date.now() - (48 - i) * 1_800_000).toISOString(),
  score: Math.round(22 + Math.sin(i / 4) * 12 + Math.random() * 6),
}));
const BREAKDOWN: Record<Severity, number> = {
  alert: 21,
  mild: 9,
  drowsy: 5,
  critical: 3,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="kicker">{title}</h2>
      {children}
    </section>
  );
}

export function ComponentGalleryPage() {
  const [slider, setSlider] = useState([50]);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Galeria de componentes"
        description="Referência visual do sistema de design do Helio. Alterne o tema na barra superior."
      />

      <Section title="Cores semânticas de fadiga">
        <div className="flex flex-wrap gap-2">
          {SEVERITY_ORDER.map((s, i) => (
            <SeverityPill key={s} severity={s} score={[12, 38, 63, 88][i]} />
          ))}
        </div>
      </Section>

      <Section title="Status do sistema">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="ok">Em rota</StatusBadge>
          <StatusBadge tone="warn">Parado</StatusBadge>
          <StatusBadge tone="danger" pulse>
            Câmera offline
          </StatusBadge>
          <StatusBadge tone="info">Treinando</StatusBadge>
          <StatusBadge tone="neutral">Arquivado</StatusBadge>
        </div>
      </Section>

      <Section title="Indicadores (StatCard)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Motoristas ativos"
            value={32}
            icon={Users}
            delta={{ value: 3, goodDirection: "up" }}
            hint="vs. ontem"
          />
          <StatCard
            label="Em fadiga agora"
            value={4}
            icon={AlertTriangle}
            accent="var(--severity-drowsy)"
            delta={{ value: 2, goodDirection: "down" }}
            hint="vs. 1h atrás"
          />
          <StatCard
            label="Dispositivos offline"
            value={5}
            icon={WifiOff}
            delta={{ value: -1, goodDirection: "down" }}
          />
          <StatCard
            label="Pontuação média"
            value={24}
            icon={Gauge}
            trend={SPARK}
          />
        </div>
      </Section>

      <Section title="Gráficos">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">
                Pontuação de fadiga da frota — 24 h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreTimeSeries data={TREND} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Distribuição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <SeverityBreakdownBar counts={BREAKDOWN} />
              <div className="flex items-center justify-around">
                <DrowsinessGauge score={28} />
                <DrowsinessGauge score={82} />
              </div>
              <Sparkline data={SPARK} width={220} height={40} className="text-primary" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="destructive">Destrutivo</Button>
          <Button size="sm">Pequeno</Button>
          <Button disabled>Desabilitado</Button>
          <Button onClick={() => toast.success("Alerta reconhecido", { description: "evt_0412 · João Batista" })}>
            Disparar toast
          </Button>
        </div>
      </Section>

      <Section title="Formulários">
        <div className="grid max-w-lg gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-email">E-mail</Label>
            <Input id="g-email" placeholder="gestor@empresa.com.br" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox defaultChecked /> Notificar por e-mail
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch defaultChecked /> Alertas por SMS
            </label>
          </div>
          <div className="space-y-2">
            <Label>Limiar crítico — {slider[0]}</Label>
            <Slider value={slider} onValueChange={setSlider} min={0} max={100} step={1} />
          </div>
          <Select defaultValue="drowsy">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mild">Fadiga leve</SelectItem>
              <SelectItem value="drowsy">Sonolento</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Abas, progresso, badges">
        <Tabs defaultValue="a" className="max-w-md">
          <TabsList>
            <TabsTrigger value="a">Resumo</TabsTrigger>
            <TabsTrigger value="b">Métricas</TabsTrigger>
            <TabsTrigger value="c">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="text-sm text-muted-foreground">
            Conteúdo da aba Resumo.
          </TabsContent>
          <TabsContent value="b">
            <Progress value={68} />
          </TabsContent>
          <TabsContent value="c" className="flex gap-2">
            <Badge>v1.6.0</Badge>
            <Badge variant="secondary">candidato</Badge>
            <Badge variant="outline">arquivado</Badge>
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Estados de carregamento e vazio">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-24 w-full" />
          </Card>
          <EmptyState
            icon={Truck}
            title="Nenhum caminhão nesta região"
            description="Ajuste os filtros ou aproxime o mapa para ver as unidades."
            action={<Button size="sm" variant="outline">Limpar filtros</Button>}
          />
        </div>
      </Section>

      <Section title="Ícone de contexto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cpu className="size-4" /> Dispositivos de borda ·{" "}
          <span className="font-data">dev_014</span> ·{" "}
          <span className="font-data">HELIO-IR3</span>
        </div>
      </Section>
    </div>
  );
}
