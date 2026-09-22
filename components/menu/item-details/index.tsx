"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { setItemAvailabilityAction } from "@/app/(app)/(admin)/menu/actions";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";
import SectionHeading from "@/components/common/SectionHeading";
import Toggle from "@/components/common/Toggle";
import PageHeader from "@/components/layout/page-header";
import PageBody from "@/components/layout/page-body";
import type {
  DealSlotFull,
  MenuItemDetails as MenuItemDetailsData,
  RecipeLine,
  VariantFull,
} from "@/server/menu/queries";
import { callAction } from "@/utils/call-action";
import { routes } from "@/utils/routes";
import ItemFormSheet from "../item-form-sheet";
import CopyRecipeSheet from "./copy-recipe-sheet";
import IngredientSheet from "./ingredient-sheet";
import SlotList from "./slot-list";
import SlotSheet from "./slot-sheet";
import VariantCard from "./variant-card";
import VariantSheet from "./variant-sheet";

type Sheet =
  | { type: "edit" }
  | { type: "variant"; variant?: VariantFull }
  | { type: "ingredient"; variant: VariantFull; line?: RecipeLine }
  | { type: "copy"; variant: VariantFull }
  | { type: "slot"; dealVariantId: number; slot?: DealSlotFull }
  | null;

interface MenuItemDetailsProps {
  details: MenuItemDetailsData;
}

export default function MenuItemDetails({ details }: MenuItemDetailsProps) {
  const { item, categories, inventory, variantChoices, recipeSources, orderLines, dealUses } = details;
  const isDeal = item.kind === "deal";
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const openSheet = (next: Exclude<Sheet, null>) => {
    setSheetKey((k) => k + 1);
    setSheet(next);
  };
  const closeSheet = () => setSheet(null);

  const toggleAvailability = (isAvailable: boolean) => {
    startTransition(async () => {
      const result = await callAction(setItemAvailabilityAction(item.id, isAvailable));
      if (!result.ok) toast.error(result.error);
      else toast.success(isAvailable ? "Back on sale" : "Marked sold out");
    });
  };

  const dealVariant = isDeal ? item.variants[0] : undefined;
  const subtitle = [item.category.name, isDeal ? "Deal" : null, !item.isActive ? "Hidden" : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={item.name}
        subtitle={subtitle}
        backHref={routes.ui.menu}
        actions={
          <Button
            size="sm"
            variant="header"
            startIcon={<Pencil className="h-4 w-4" />}
            onClick={() => openSheet({ type: "edit" })}
          >
            Edit
          </Button>
        }
      />

      <PageBody gap={4}>
        {item.description && <p className="px-1 text-sm text-muted">{item.description}</p>}

        <Toggle
          label={item.isAvailable ? "Available on the counter" : "Sold out"}
          description={
            item.isAvailable
              ? "Switch off when the kitchen runs out; staff can do this too."
              : "Hidden from the counter until switched back on."
          }
          checked={item.isAvailable}
          disabled={isPending || !item.isActive}
          onChange={toggleAvailability}
        />

        {!item.isActive && (
          <Card className="text-sm text-muted">
            This item is hidden from the menu. Use Edit → “On the menu” to bring it back.
          </Card>
        )}

        {isDeal && dealVariant ? (
          <>
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <SectionHeading>
                  Price
                </SectionHeading>
              </div>
              <VariantCard
                variant={dealVariant}
                isDeal
                onEdit={() => openSheet({ type: "variant", variant: dealVariant })}
                onAddIngredient={() => openSheet({ type: "ingredient", variant: dealVariant })}
                onEditIngredient={(line) =>
                  openSheet({ type: "ingredient", variant: dealVariant, line })
                }
                otherVariants={[]}
              />
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <SectionHeading>
                  What the customer gets
                </SectionHeading>
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Plus className="h-4 w-4" />}
                  onClick={() => openSheet({ type: "slot", dealVariantId: dealVariant.id })}
                >
                  Add slot
                </Button>
              </div>
              <SlotList
                slots={dealVariant.dealSlots}
                onEdit={(slot) => openSheet({ type: "slot", dealVariantId: dealVariant.id, slot })}
              />
            </section>
          </>
        ) : (
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <SectionHeading>
                {item.variants.length === 1 ? "Price & recipe" : "Sizes, prices & recipes"}
              </SectionHeading>
              <Button
                size="sm"
                variant="outline"
                startIcon={<Plus className="h-4 w-4" />}
                onClick={() => openSheet({ type: "variant" })}
              >
                Add size
              </Button>
            </div>
            {item.variants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                isDeal={false}
                sole={item.variants.length === 1}
                otherVariants={item.variants.filter(
                  (v) => v.id !== variant.id && v.recipes.length > 0
                )}
                canCopyFromOtherItem={recipeSources.some((s) => s.itemId !== item.id)}
                onEdit={() => openSheet({ type: "variant", variant })}
                onAddIngredient={() => openSheet({ type: "ingredient", variant })}
                onEditIngredient={(line) => openSheet({ type: "ingredient", variant, line })}
                onCopyFromOtherItem={() => openSheet({ type: "copy", variant })}
              />
            ))}
          </section>
        )}

        {inventory.length === 0 && !isDeal && (
          <Card className="flex items-start gap-3 text-sm">
            <Badge variant="warning">Tip</Badge>
            <p className="text-muted">
              No inventory items yet. Add ingredients under Inventory first, then link them here.
            </p>
          </Card>
        )}
      </PageBody>

      <ItemFormSheet
        key={`edit-${sheetKey}`}
        open={sheet?.type === "edit"}
        onOpenChange={(open) => !open && closeSheet()}
        categories={categories}
        item={item}
        deleteBlock={{ orderLines, dealUses }}
      />
      <VariantSheet
        key={`variant-${sheetKey}`}
        open={sheet?.type === "variant"}
        onOpenChange={(open) => !open && closeSheet()}
        itemId={item.id}
        variant={sheet?.type === "variant" ? sheet.variant : undefined}
        isDealPrice={isDeal}
        sole={item.variants.length === 1}
      />
      <IngredientSheet
        key={`ingredient-${sheetKey}`}
        open={sheet?.type === "ingredient"}
        onOpenChange={(open) => !open && closeSheet()}
        itemName={item.name}
        variant={sheet?.type === "ingredient" ? sheet.variant : undefined}
        siblingVariants={sheet?.type === "ingredient" && !isDeal ? item.variants.filter((v) => v.id !== sheet.variant.id && v.isActive) : []}
        line={sheet?.type === "ingredient" ? sheet.line : undefined}
        inventory={inventory}
      />
      <CopyRecipeSheet
        key={`copy-${sheetKey}`}
        open={sheet?.type === "copy"}
        onOpenChange={(open) => !open && closeSheet()}
        target={sheet?.type === "copy" ? sheet.variant : undefined}
        targetItemId={item.id}
        sources={recipeSources}
      />
      <SlotSheet
        key={`slot-${sheetKey}`}
        open={sheet?.type === "slot"}
        onOpenChange={(open) => !open && closeSheet()}
        dealVariantId={sheet?.type === "slot" ? sheet.dealVariantId : undefined}
        slot={sheet?.type === "slot" ? sheet.slot : undefined}
        choices={variantChoices}
      />
    </>
  );
}
