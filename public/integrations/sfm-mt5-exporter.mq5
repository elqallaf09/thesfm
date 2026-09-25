// THE SFM read-only MT5 script. No orders, trades or credential export.
#property strict
#property script_show_inputs
input string SfmApiKey="";
string EscapeJson(string value){StringReplace(value,"\\","\\\\");StringReplace(value,"\"","\\\"");StringReplace(value,"\r"," ");StringReplace(value,"\n"," ");StringReplace(value,"\t"," ");return value;}
void OnStart(){
 if(StringLen(SfmApiKey)!=47){Print("Set a valid SFM snapshots:write key.");return;}
 datetime observed=TimeGMT();
 MqlDateTime t;TimeToStruct(observed,t);
 string stamp=StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",t.year,t.mon,t.day,t.hour,t.min,t.sec);
 string currency=AccountInfoString(ACCOUNT_CURRENCY);
 if(StringLen(currency)!=3){Print("Account currency must be an ISO currency code; cent accounts require explicit conversion.");return;}
 string positions="";
 for(int i=0;i<PositionsTotal();i++){
  ulong ticket=PositionGetTicket(i);if(ticket==0)continue;
  if(positions!="")positions+=",";
  // MT5 volume is lots, not shares. Preserve the unit in the symbol and do not invent a market value.
  double quantity=PositionGetDouble(POSITION_VOLUME);if(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_SELL)quantity=-quantity;
  positions+="{\"symbol\":\""+EscapeJson(PositionGetString(POSITION_SYMBOL)+" [lots]")+"\",\"quantity\":"+DoubleToString(quantity,8)+",\"value\":null,\"currency\":\""+EscapeJson(currency)+"\"}";
 }
 string body="{\"source\":\"mt5\",\"externalId\":\""+IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN))+"-"+IntegerToString((long)observed)+"\",\"observedAt\":\""+stamp+"\",\"currency\":\""+EscapeJson(currency)+"\",\"balance\":"+DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE),8)+",\"equity\":"+DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY),8)+",\"positions\":["+positions+"]}";
 char payload[],response[];StringToCharArray(body,payload,0,WHOLE_ARRAY,CP_UTF8);ArrayResize(payload,ArraySize(payload)-1);
 string responseHeaders;string headers="Content-Type: application/json\r\nAuthorization: Bearer "+SfmApiKey+"\r\n";
 int status=WebRequest("POST","https://www.the-sfm.com/api/connect/v1/snapshots",headers,10000,payload,response,responseHeaders);
 // Only status is logged. Never print API keys, account identifiers or financial payloads.
 Print("SFM snapshot HTTP status: ",status);
}
