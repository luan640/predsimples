"use client";

import { useState } from "react";
import { Download, FileText, Link as LinkIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildOrcamentoFilename } from "@/lib/format";

export function PdfActionsDialog({
  budgetId,
  numero,
  titulo,
}: {
  budgetId: string;
  numero?: string | null;
  titulo: string;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleCopyLink() {
    const url = `${window.location.origin}/orcamentos/${budgetId}/pdf`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
    setOpen(false);
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(`/orcamentos/${budgetId}/pdf`);
      if (!response.ok) throw new Error("Falha ao gerar o PDF.");
      const blob = await response.blob();
      const filename = buildOrcamentoFilename(numero, titulo);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
      setOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error("Não foi possível baixar o PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <FileText className="size-4" />
        <span className="hidden sm:inline">PDF</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Relatório em PDF</DialogTitle>
          <DialogDescription>Baixe o relatório ou copie o link para enviar ao cliente.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" className="justify-start" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Baixar PDF
          </Button>
          <Button variant="secondary" className="justify-start" onClick={handleCopyLink}>
            <LinkIcon className="size-4" />
            Copiar link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
