"use client";

import { useState } from "react";
import { Download, FileText, Link as LinkIcon } from "lucide-react";
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
          <Button
            variant="secondary"
            className="justify-start"
            render={
              <a
                href={`/orcamentos/${budgetId}/pdf`}
                download={buildOrcamentoFilename(numero, titulo)}
                onClick={() => setOpen(false)}
              />
            }
            nativeButton={false}
          >
            <Download className="size-4" />
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
