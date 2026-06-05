alter table public.investment_items
  add column if not exists unit text,
  add column if not exists purchase_total numeric,
  add column if not exists profit_loss numeric,
  add column if not exists profit_loss_percent numeric,
  add column if not exists default_currency_value numeric,
  add column if not exists location text,
  add column if not exists property_type text,
  add column if not exists expected_monthly_income numeric,
  add column if not exists expected_monthly_expense numeric,
  add column if not exists maturity_date date;

update public.investment_items
set
  purchase_total = coalesce(
    purchase_total,
    case
      when quantity is not null and purchase_price is not null then quantity * purchase_price
      else null
    end,
    invested_amount,
    initial_value,
    purchase_price,
    value,
    amount
  ),
  default_currency_value = coalesce(
    default_currency_value,
    converted_market_value,
    current_value,
    amount,
    current_market_value,
    native_market_value
  ),
  profit_loss = coalesce(
    profit_loss,
    coalesce(native_market_value, current_market_value, current_value, amount, value)
      - coalesce(
          purchase_total,
          case
            when quantity is not null and purchase_price is not null then quantity * purchase_price
            else null
          end,
          invested_amount,
          initial_value,
          purchase_price,
          value,
          amount
        )
  ),
  profit_loss_percent = coalesce(
    profit_loss_percent,
    case
      when coalesce(
        purchase_total,
        case
          when quantity is not null and purchase_price is not null then quantity * purchase_price
          else null
        end,
        invested_amount,
        initial_value,
        purchase_price,
        value,
        amount
      ) > 0 then
        (
          coalesce(native_market_value, current_market_value, current_value, amount, value)
          - coalesce(
              purchase_total,
              case
                when quantity is not null and purchase_price is not null then quantity * purchase_price
                else null
              end,
              invested_amount,
              initial_value,
              purchase_price,
              value,
              amount
            )
        )
        / coalesce(
            purchase_total,
            case
              when quantity is not null and purchase_price is not null then quantity * purchase_price
              else null
            end,
            invested_amount,
            initial_value,
            purchase_price,
            value,
            amount
          ) * 100
      else null
    end
  )
where purchase_total is null
   or default_currency_value is null
   or profit_loss is null
   or profit_loss_percent is null;

create index if not exists investment_items_user_asset_type_idx
  on public.investment_items (user_id, asset_type);

notify pgrst, 'reload schema';
