import * as vscode from "vscode";
import {
  fetchAccessArtifacts,
  fetchAccessFacts,
  fetchAccessUsageFacts,
  fetchAccounts,
  fetchArtifactBindings,
  fetchCustomers,
  fetchInitiatives,
  fetchOwnershipAssignments,
  fetchResources,
  fetchSubjects,
  fetchThreatFacts,
} from "../../api/platformClient";
import type {
  AccessArtifactFromApi,
  AccessFactFromApi,
  AccessUsageFactFromApi,
  AccountFromApi,
  ArtifactBindingFromApi,
  CustomerFromApi,
  InitiativeFromApi,
  OwnershipAssignmentFromApi,
  ResourceFromApi,
  SubjectFromApi,
  ThreatFactFromApi,
} from "../../api/types";
import { mapAccessArtifactsToNodes } from "./accessArtifactsMapper";
import { mapAccessFactsToNodes } from "./accessFactsMapper";
import { mapAccessUsageFactsToNodes } from "./accessUsageFactsMapper";
import { mapAccountsToNodes } from "./accountsMapper";
import { mapArtifactBindingsToNodes } from "./artifactBindingsMapper";
import { mapCustomersToNodes } from "./customersMapper";
import { mapInitiativesToNodes } from "./initiativesMapper";
import { mapOwnershipAssignmentsToNodes } from "./ownershipAssignmentsMapper";
import { mapResourcesToNodes } from "./resourcesMapper";
import { mapSubjectsToNodes } from "./subjectsMapper";
import { mapThreatFactsToNodes } from "./threatFactsMapper";

// ─── Node classes ─────────────────────────────────────────────────────────────

export class CategoryNode extends vscode.TreeItem {
  readonly kind = "category" as const;

  constructor(public readonly categoryKey: string, label: string) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = `aurelion.inventory.category.${categoryKey}`;
    this.contextValue = "aurelion.inventoryCategory";
    this.iconPath = new vscode.ThemeIcon("folder");
  }
}

export class CustomerItemNode extends vscode.TreeItem {
  readonly kind = "customerItem" as const;

  constructor(vm: {
    customerId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.customer.${vm.customerId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryCustomer";
    this.iconPath = new vscode.ThemeIcon("person");
  }
}

export class SubjectItemNode extends vscode.TreeItem {
  readonly kind = "subjectItem" as const;

  constructor(vm: {
    subjectId: string;
    label: string;
    description: string;
    tooltipLines: string[];
    contextValue: string;
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.subject.${vm.subjectId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = vm.contextValue;
    this.iconPath = new vscode.ThemeIcon("account");
  }
}

export class AccountItemNode extends vscode.TreeItem {
  readonly kind = "accountItem" as const;

  constructor(vm: {
    accountId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.account.${vm.accountId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryAccount";
    this.iconPath = new vscode.ThemeIcon("key");
  }
}

export class ResourceItemNode extends vscode.TreeItem {
  readonly kind = "resourceItem" as const;

  constructor(vm: {
    resourceId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.resource.${vm.resourceId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryResource";
    this.iconPath = new vscode.ThemeIcon("server");
  }
}

export class AccessArtifactItemNode extends vscode.TreeItem {
  readonly kind = "accessArtifactItem" as const;

  constructor(vm: {
    artifactId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.accessArtifact.${vm.artifactId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryAccessArtifact";
    this.iconPath = new vscode.ThemeIcon("archive");
  }
}

export class ArtifactBindingItemNode extends vscode.TreeItem {
  readonly kind = "artifactBindingItem" as const;

  constructor(vm: {
    bindingId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.artifactBinding.${vm.bindingId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryArtifactBinding";
    this.iconPath = new vscode.ThemeIcon("link");
  }
}

export class AccessFactItemNode extends vscode.TreeItem {
  readonly kind = "accessFactItem" as const;

  constructor(vm: {
    factId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.accessFact.${vm.factId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryAccessFact";
    this.iconPath = new vscode.ThemeIcon("key");
  }
}

export class InitiativeItemNode extends vscode.TreeItem {
  readonly kind = "initiativeItem" as const;

  constructor(vm: {
    initiativeId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.initiative.${vm.initiativeId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryInitiative";
    this.iconPath = new vscode.ThemeIcon("rocket");
  }
}

export class OwnershipAssignmentItemNode extends vscode.TreeItem {
  readonly kind = "ownershipAssignmentItem" as const;

  constructor(vm: {
    assignmentId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.ownershipAssignment.${vm.assignmentId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryOwnershipAssignment";
    this.iconPath = new vscode.ThemeIcon("shield");
  }
}

export class AccessUsageFactItemNode extends vscode.TreeItem {
  readonly kind = "accessUsageFactItem" as const;

  constructor(vm: {
    usageFactId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.accessUsageFact.${vm.usageFactId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryAccessUsageFact";
    this.iconPath = new vscode.ThemeIcon("pulse");
  }
}

export class ThreatFactItemNode extends vscode.TreeItem {
  readonly kind = "threatFactItem" as const;

  constructor(vm: {
    factId: string;
    label: string;
    description: string;
    tooltipLines: string[];
  }) {
    super(vm.label, vscode.TreeItemCollapsibleState.None);
    this.id = `aurelion.inventory.threatFact.${vm.factId}`;
    this.description = vm.description;
    const tooltip = new vscode.MarkdownString(vm.tooltipLines.join("\n\n"));
    tooltip.isTrusted = false;
    this.tooltip = tooltip;
    this.contextValue = "aurelion.inventoryThreatFact";
    this.iconPath = new vscode.ThemeIcon("warning");
  }
}

export class EmptyCategoryChildNode extends vscode.TreeItem {
  readonly kind = "emptyCategoryChild" as const;

  constructor(label = "(no items)") {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

export class FailedCategoryChildNode extends vscode.TreeItem {
  readonly kind = "failedCategoryChild" as const;

  constructor(categoryKey: string) {
    super("(failed to load — click to retry)", vscode.TreeItemCollapsibleState.None);
    this.iconPath = new vscode.ThemeIcon("error");
    this.command = {
      command: "aurelion.refreshInventoryCategory",
      title: "Retry",
      arguments: [{ categoryKey }],
    };
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemNode =
  | CustomerItemNode
  | SubjectItemNode
  | AccountItemNode
  | ResourceItemNode
  | AccessArtifactItemNode
  | AccessFactItemNode
  | ArtifactBindingItemNode
  | InitiativeItemNode
  | OwnershipAssignmentItemNode
  | AccessUsageFactItemNode
  | ThreatFactItemNode;

type InventoryNode =
  | CategoryNode
  | ItemNode
  | EmptyCategoryChildNode
  | FailedCategoryChildNode;

type CategoryCacheEntry =
  | { state: "loading" }
  | { state: "loaded"; items: ItemNode[] }
  | { state: "failed"; error: unknown };

type CategoryDef = {
  key: string;
  label: string;
  fetchChildren: () => Promise<ItemNode[]>;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export class InventoryTreeDataProvider
  implements vscode.TreeDataProvider<InventoryNode>, vscode.Disposable
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    InventoryNode | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly childrenCache = new Map<string, CategoryCacheEntry>();

  private readonly categories: CategoryDef[] = [
    {
      key: "customers",
      label: "Customers",
      fetchChildren: () => this._fetchCustomerNodes(),
    },
    {
      key: "subjects",
      label: "Subjects",
      fetchChildren: () => this._fetchSubjectNodes(),
    },
    {
      key: "accounts",
      label: "Accounts",
      fetchChildren: () => this._fetchAccountNodes(),
    },
    {
      key: "resources",
      label: "Resources",
      fetchChildren: () => this._fetchResourceNodes(),
    },
    {
      key: "accessArtifacts",
      label: "Access Artifacts",
      fetchChildren: () => this._fetchAccessArtifactNodes(),
    },
    {
      key: "accessFacts",
      label: "Access Facts",
      fetchChildren: () => this._fetchAccessFactNodes(),
    },
    {
      key: "artifactBindings",
      label: "Artifact Bindings",
      fetchChildren: () => this._fetchArtifactBindingNodes(),
    },
    {
      key: "initiatives",
      label: "Initiatives",
      fetchChildren: () => this._fetchInitiativeNodes(),
    },
    {
      key: "ownershipAssignments",
      label: "Ownership Assignments",
      fetchChildren: () => this._fetchOwnershipAssignmentNodes(),
    },
    {
      key: "accessUsageFacts",
      label: "Access Usage Facts",
      fetchChildren: () => this._fetchAccessUsageFactNodes(),
    },
    {
      key: "threatFacts",
      label: "Threat Facts",
      fetchChildren: () => this._fetchThreatFactNodes(),
    },
  ];

  private readonly categoryNodes: CategoryNode[];

  constructor() {
    this.categoryNodes = this.categories.map(
      (cat) => new CategoryNode(cat.key, cat.label),
    );
  }

  getTreeItem(element: InventoryNode): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: InventoryNode,
  ): vscode.ProviderResult<InventoryNode[]> {
    if (element === undefined) {
      return this.categoryNodes;
    }

    if (element.kind !== "category") {
      return [];
    }

    const cat = this.categories.find((c) => c.key === element.categoryKey);
    if (!cat) {
      return [];
    }

    const entry = this.childrenCache.get(cat.key);

    if (entry === undefined) {
      // First expand: kick off fetch and return empty while loading
      this.childrenCache.set(cat.key, { state: "loading" });
      void this._loadCategory(cat, element);
      return [];
    }

    if (entry.state === "loading") {
      return [];
    }

    if (entry.state === "failed") {
      return [new FailedCategoryChildNode(element.categoryKey)];
    }

    // loaded
    if (entry.items.length === 0) {
      return [
        new EmptyCategoryChildNode(
          cat.key === "subjects"
            ? "(no subjects)"
            : cat.key === "accounts"
              ? "(no accounts)"
              : cat.key === "resources"
                ? "(no resources)"
                : cat.key === "accessArtifacts"
                  ? "(no access artifacts)"
                  : cat.key === "accessFacts"
                    ? "(no access facts)"
                    : cat.key === "artifactBindings"
                      ? "(no artifact bindings)"
                      : cat.key === "initiatives"
                      ? "(no initiatives)"
                      : cat.key === "ownershipAssignments"
                        ? "(no ownership assignments)"
                        : cat.key === "accessUsageFacts"
                          ? "(no usage facts)"
                          : cat.key === "threatFacts"
                            ? "(no threat facts)"
                            : "(no items)",
        ),
      ];
    }
    return entry.items;
  }

  private async _loadCategory(
    cat: CategoryDef,
    categoryNode: CategoryNode,
  ): Promise<void> {
    try {
      const items = await cat.fetchChildren();
      this.childrenCache.set(cat.key, { state: "loaded", items });
    } catch (error) {
      this.childrenCache.set(cat.key, { state: "failed", error });
    }
    this._onDidChangeTreeData.fire(categoryNode);
  }

  private async _fetchCustomerNodes(): Promise<CustomerItemNode[]> {
    const raw: CustomerFromApi[] = await fetchCustomers();
    const vms = mapCustomersToNodes(raw);
    return vms.map((vm) => new CustomerItemNode(vm));
  }

  private async _fetchSubjectNodes(): Promise<SubjectItemNode[]> {
    const raw: SubjectFromApi[] = await fetchSubjects();
    const vms = mapSubjectsToNodes(raw);
    return vms.map((vm) => new SubjectItemNode(vm));
  }

  private async _fetchAccountNodes(): Promise<AccountItemNode[]> {
    const raw: AccountFromApi[] = await fetchAccounts();
    return mapAccountsToNodes(raw).map((vm) => new AccountItemNode(vm));
  }

  private async _fetchResourceNodes(): Promise<ResourceItemNode[]> {
    const raw: ResourceFromApi[] = await fetchResources();
    return mapResourcesToNodes(raw).map((vm) => new ResourceItemNode(vm));
  }

  private async _fetchAccessArtifactNodes(): Promise<AccessArtifactItemNode[]> {
    const raw: AccessArtifactFromApi[] = await fetchAccessArtifacts();
    return mapAccessArtifactsToNodes(raw).map(
      (vm) => new AccessArtifactItemNode(vm),
    );
  }

  private async _fetchAccessFactNodes(): Promise<AccessFactItemNode[]> {
    const raw: AccessFactFromApi[] = await fetchAccessFacts();
    return mapAccessFactsToNodes(raw).map((vm) => new AccessFactItemNode(vm));
  }

  private async _fetchArtifactBindingNodes(): Promise<ArtifactBindingItemNode[]> {
    const raw: ArtifactBindingFromApi[] = await fetchArtifactBindings();
    return mapArtifactBindingsToNodes(raw).map(
      (vm) => new ArtifactBindingItemNode(vm),
    );
  }

  private async _fetchInitiativeNodes(): Promise<InitiativeItemNode[]> {
    const raw: InitiativeFromApi[] = await fetchInitiatives();
    return mapInitiativesToNodes(raw).map((vm) => new InitiativeItemNode(vm));
  }

  private async _fetchOwnershipAssignmentNodes(): Promise<OwnershipAssignmentItemNode[]> {
    const raw: OwnershipAssignmentFromApi[] = await fetchOwnershipAssignments();
    return mapOwnershipAssignmentsToNodes(raw).map(
      (vm) => new OwnershipAssignmentItemNode(vm),
    );
  }

  private async _fetchAccessUsageFactNodes(): Promise<AccessUsageFactItemNode[]> {
    const raw: AccessUsageFactFromApi[] = await fetchAccessUsageFacts();
    return mapAccessUsageFactsToNodes(raw).map((vm) => new AccessUsageFactItemNode(vm));
  }

  private async _fetchThreatFactNodes(): Promise<ThreatFactItemNode[]> {
    const raw: ThreatFactFromApi[] = await fetchThreatFacts();
    return mapThreatFactsToNodes(raw).map((vm) => new ThreatFactItemNode(vm));
  }

  getCategoryNode(key: string): CategoryNode | undefined {
    return this.categoryNodes.find((n) => n.categoryKey === key);
  }

  refreshCategory(categoryNode: CategoryNode): void {
    this.childrenCache.delete(categoryNode.categoryKey);
    const cat = this.categories.find(
      (c) => c.key === categoryNode.categoryKey,
    );
    if (!cat) {
      return;
    }
    this.childrenCache.set(cat.key, { state: "loading" });
    void this._loadCategory(cat, categoryNode);
    this._onDidChangeTreeData.fire(categoryNode);
  }

  refresh(): void {
    this.childrenCache.clear();
    this._onDidChangeTreeData.fire();
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
