# WMS Navigation Redesign

This redesign follows the competitive WMS pattern documented in `docs/wms-competitive-blueprint.md`: workflow-first navigation for daily operations, with technical/admin screens kept as deep links.

## Target Primary Navigation

| Navigation | Route | User intent | Deep links merged under it |
| --- | --- | --- | --- |
| `Обзор` | `/wms` | See warehouse health, exceptions, and recent activity. | dashboard widgets |
| `Задачи` | `/wms/tasks` | Start daily warehouse work from one task center. | put-away, transfers, open work, packing, counts |
| `Товары и остатки` | `/wms/stock` | Manage/search products, barcodes, stock, and corrections. | `/wms/products`, `/wms/inventory`, `/wms/barcodes`, `/wms/adjustments` |
| `Приёмка` | `/wms/receiving` | Receive expected, unexpected, and damaged goods. | receiving sessions |
| `Сборка и упаковка` | `/wms/fulfillment` | Create/execute picking and packing work. | `/wms/picking`, `/wms/packing`, `/api/orders` workflows |
| `Инвентаризация` | `/wms/cycle-counts` | Count stock and approve discrepancies. | cycle count sessions |
| `Пополнение` | `/wms/replenishment` | Keep pick locations stocked. | replenishment rules and work |
| `Склады` | `/wms/locations` | Configure warehouses, zones, locations, and rules. | `/wms/warehouses`, location/rule setup |
| `Журнал` | `/wms/journal` | Review movement history, audit logs, and reconciliation. | `/wms/movements`, `/wms/audit`, `/wms/reconciliation` |
| `Настройки` | `/wms/settings` | Manage users, organizations, permissions, and setup. | settings modules |

## Worker Start Pattern

Warehouse workers should usually land on `Задачи`, not on product tables or settings.

Every task card should answer:

- `Что нужно сделать?`
- `Где товар?`
- `Какой статус?`
- `Что пошло не так?`
- `Что делать дальше?`

## Manager Pattern

Managers should use:

- `Обзор` for bottlenecks and exceptions;
- `Задачи` for operational work queue;
- `Товары и остатки` for inventory and correction visibility;
- `Журнал` for movement/audit/reconciliation;
- `Настройки` for controlled configuration.

## Implementation Status

- `IMPLEMENTED`: primary navigation is consolidated into the target workflow hubs.
- `PARTIAL`: deep technical pages still exist and remain accessible.
- `GAP`: `Задачи` needs a real task-center API and actionable queue, not only links.
- `GAP`: browser/mobile E2E must prove workers can complete flows from the new navigation.
