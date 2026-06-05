alter table public.investment_items
  add column if not exists name text,
  add column if not exists symbol text,
  add column if not exists market text,
  add column if not exists asset_type text,
  add column if not exists currency text,
  add column if not exists quantity numeric,
  add column if not exists unit text,
  add column if not exists purchase_price numeric,
  add column if not exists current_price numeric,
  add column if not exists current_value numeric,
  add column if not exists purchase_total numeric,
  add column if not exists profit_loss numeric,
  add column if not exists profit_loss_percent numeric,
  add column if not exists default_currency_value numeric,
  add column if not exists location text,
  add column if not exists property_type text,
  add column if not exists expected_monthly_income numeric,
  add column if not exists expected_monthly_expense numeric,
  add column if not exists maturity_date date,
  add column if not exists notes text;

update public.investment_items as item
set
  purchase_total = coalesce(
    item.purchase_total,
    case
      when item.quantity is not null and item.purchase_price is not null then item.quantity * item.purchase_price
      else null
    end,
    nullif(to_jsonb(item)->>'invested_amount', '')::numeric,
    nullif(to_jsonb(item)->>'initial_value', '')::numeric,
    item.purchase_price,
    nullif(to_jsonb(item)->>'value', '')::numeric,
    nullif(to_jsonb(item)->>'amount', '')::numeric
  ),
  default_currency_value = coalesce(
    item.default_currency_value,
    nullif(to_jsonb(item)->>'converted_market_value', '')::numeric,
    item.current_value,
    nullif(to_jsonb(item)->>'amount', '')::numeric,
    nullif(to_jsonb(item)->>'current_market_value', '')::numeric,
    nullif(to_jsonb(item)->>'native_market_value', '')::numeric
  ),
  profit_loss = coalesce(
    item.profit_loss,
    coalesce(
      nullif(to_jsonb(item)->>'native_market_value', '')::numeric,
      nullif(to_jsonb(item)->>'current_market_value', '')::numeric,
      item.current_value,
      nullif(to_jsonb(item)->>'amount', '')::numeric,
      nullif(to_jsonb(item)->>'value', '')::numeric
    )
      - coalesce(
          item.purchase_total,
          case
            when item.quantity is not null and item.purchase_price is not null then item.quantity * item.purchase_price
            else null
          end,
          nullif(to_jsonb(item)->>'invested_amount', '')::numeric,
          nullif(to_jsonb(item)->>'initial_value', '')::numeric,
          item.purchase_price,
          nullif(to_jsonb(item)->>'value', '')::numeric,
          nullif(to_jsonb(item)->>'amount', '')::numeric
        )
  ),
  profit_loss_percent = coalesce(
    item.profit_loss_percent,
    case
      when coalesce(
        item.purchase_total,
        case
          when item.quantity is not null and item.purchase_price is not null then item.quantity * item.purchase_price
          else null
        end,
        nullif(to_jsonb(item)->>'invested_amount', '')::numeric,
        nullif(to_jsonb(item)->>'initial_value', '')::numeric,
        item.purchase_price,
        nullif(to_jsonb(item)->>'value', '')::numeric,
        nullif(to_jsonb(item)->>'amount', '')::numeric
      ) > 0 then
        (
          coalesce(
            nullif(to_jsonb(item)->>'native_market_value', '')::numeric,
            nullif(to_jsonb(item)->>'current_market_value', '')::numeric,
            item.current_value,
            nullif(to_jsonb(item)->>'amount', '')::numeric,
            nullif(to_jsonb(item)->>'value', '')::numeric
          )
          - coalesce(
              item.purchase_total,
              case
                when item.quantity is not null and item.purchase_price is not null then item.quantity * item.purchase_price
                else null
              end,
              nullif(to_jsonb(item)->>'invested_amount', '')::numeric,
              nullif(to_jsonb(item)->>'initial_value', '')::numeric,
              item.purchase_price,
              nullif(to_jsonb(item)->>'value', '')::numeric,
              nullif(to_jsonb(item)->>'amount', '')::numeric
            )
        )
        / coalesce(
            item.purchase_total,
            case
              when item.quantity is not null and item.purchase_price is not null then item.quantity * item.purchase_price
              else null
            end,
            nullif(to_jsonb(item)->>'invested_amount', '')::numeric,
            nullif(to_jsonb(item)->>'initial_value', '')::numeric,
            item.purchase_price,
            nullif(to_jsonb(item)->>'value', '')::numeric,
            nullif(to_jsonb(item)->>'amount', '')::numeric
          ) * 100
      else null
    end
  )
where item.purchase_total is null
   or item.default_currency_value is null
   or item.profit_loss is null
   or item.profit_loss_percent is null;

create index if not exists investment_items_user_asset_type_idx
  on public.investment_items (user_id, asset_type);

notify pgrst, 'reload schema';
