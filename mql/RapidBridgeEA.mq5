//+------------------------------------------------------------------+
//|                                          RapidBridgeEA.mq5       |
//+------------------------------------------------------------------+
#property copyright "RapidFX"
#property version   "1.00"
#property description "Bridge EA between MetaTrader 5 and RapidFX bot engine"
#property description "Sends price data to local bot engine and executes trade commands"

#include <Trade/Trade.mqh>
#include <Trade/PositionInfo.mqh>
#include <Trade/AccountInfo.mqh>

input string InpServerUrl      = "http://127.0.0.1:3001";
input int    InpHeartbeatMs    = 3000;
input int    InpCommandPollMs  = 1000;
input int    InpMaxSlippage    = 10;

CTrade       Trade;
CPositionInfo PosInfo;
CAccountInfo  AccInfo;

string       gServerUrl;
datetime     gLastHeartbeat = 0;
datetime     gLastCommand   = 0;

//+------------------------------------------------------------------+
int OnInit() {
   gServerUrl = InpServerUrl;
   Trade.SetExpertMagicNumber(123456);
   Trade.SetDeviationInPoints(InpMaxSlippage);

   EventSetTimer(1);

   Print("RapidBridgeEA initialized");
   Print("Server: ", gServerUrl);
   Print("Add '", gServerUrl, "' to MT5: Tools > Options > Expert Advisors > Allow WebRequest");

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
   EventKillTimer();
   Print("RapidBridgeEA deinitialized (reason: ", reason, ")");
}

//+------------------------------------------------------------------+
void OnTick() {
   Process();
}

//+------------------------------------------------------------------+
void OnTimer() {
   Process();
}

//+------------------------------------------------------------------+
void Process() {
   datetime now = TimeCurrent();
   if (now == 0) now = TimeLocal();

   if (now - gLastHeartbeat >= InpHeartbeatMs / 1000) {
      gLastHeartbeat = now;
      Print("Sending heartbeat...");
      SendHeartbeat();
   }

   if (now - gLastCommand >= InpCommandPollMs / 1000) {
      gLastCommand = now;
      Print("Polling commands...");
      PollCommands();
   }
}

//+------------------------------------------------------------------+
void SendHeartbeat() {
   string json = BuildHeartbeat();

   char data[], result[];
   string resultHeaders;
   StringToCharArray(json, data, 0, StringLen(json));

   ResetLastError();
   int res = WebRequest("POST", gServerUrl + "/ea/data",
      "Content-Type: application/json\r\n", 3000, data, result, resultHeaders);

   Print("Heartbeat result: ", res);
   if (res == -1) {
      int err = GetLastError();
      Print("Heartbeat error: ", err);
   }
}

//+------------------------------------------------------------------+
string BuildHeartbeat() {
   string s = "{";
   s += "\"time\":" + IntegerToString(TimeCurrent()) + ",";

   // Account
   s += "\"account\":{";
   s += "\"balance\":"  + DoubleToString(AccInfo.Balance(), 2) + ",";
   s += "\"equity\":"   + DoubleToString(AccInfo.Equity(), 2) + ",";
   s += "\"margin\":"   + DoubleToString(AccInfo.Margin(), 2) + ",";
   s += "\"marginFree\":" + DoubleToString(AccInfo.FreeMargin(), 2) + ",";
   s += "\"marginLevel\":" + DoubleToString(AccInfo.MarginLevel(), 2);
   s += "},";

   // Positions
   s += "\"positions\":[";
   bool first = true;
   for (int i = PositionsTotal() - 1; i >= 0; i--) {
      if (PosInfo.SelectByIndex(i)) {
         if (!first) s += ",";
         first = false;
         s += "{";
         s += "\"ticket\":"    + IntegerToString(PosInfo.Ticket()) + ",";
         s += "\"symbol\":\""  + PosInfo.Symbol() + "\",";
         s += "\"type\":"      + IntegerToString(PosInfo.PositionType()) + ",";
         s += "\"volume\":"    + DoubleToString(PosInfo.Volume(), 2) + ",";
         s += "\"openPrice\":" + DoubleToString(PosInfo.PriceOpen(), 5) + ",";
         s += "\"sl\":"        + DoubleToString(PosInfo.StopLoss(), 5) + ",";
         s += "\"tp\":"        + DoubleToString(PosInfo.TakeProfit(), 5) + ",";
         s += "\"profit\":"    + DoubleToString(PosInfo.Profit(), 2);
         s += "}";
      }
   }
   s += "],";

   // Symbols
   s += "\"symbols\":{";
   first = true;
   int total = SymbolsTotal(true);
   for (int i = 0; i < total; i++) {
      string sym = SymbolName(i, true);

      if (!first) s += ",";
      first = false;
      s += "\"" + sym + "\":" + BuildSymbolData(sym);
   }
   s += "}";

   s += "}";
   return s;
}

//+------------------------------------------------------------------+
string BuildSymbolData(string symbol) {
   MqlTick tick;
   SymbolInfoTick(symbol, tick);

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   int copied = CopyRates(symbol, PERIOD_M1, 0, 2, rates);

   int sp = (int)((tick.ask - tick.bid) / SymbolInfoDouble(symbol, SYMBOL_POINT));
   string s = "{";
   s += "\"bid\":"    + DoubleToString(tick.bid, 5) + ",";
   s += "\"ask\":"    + DoubleToString(tick.ask, 5) + ",";
   s += "\"spread\":" + IntegerToString(sp) + ",";
   s += "\"rates\":[";
   for (int j = 0; j < copied; j++) {
      if (j > 0) s += ",";
      s += "{\"time\":" + IntegerToString(rates[j].time) +
         ",\"open\":" + DoubleToString(rates[j].open, 5) +
         ",\"high\":" + DoubleToString(rates[j].high, 5) +
         ",\"low\":" + DoubleToString(rates[j].low, 5) +
         ",\"close\":" + DoubleToString(rates[j].close, 5) + "}";
   }
   s += "]}";
   return s;
}

//+------------------------------------------------------------------+
void PollCommands() {
   char data[], result[];
   string resultHeaders;

   int res = WebRequest("GET", gServerUrl + "/ea/commands",
      "Content-Type: application/json\r\n", 3000, data, result, resultHeaders);

   if (res == -1) {
      int err = GetLastError();
      if (err > 0 && err != 4062)
         Print("Poll error: ", err);
      return;
   }

   string response = CharArrayToString(result, 0, -1);
   if (StringLen(response) < 3) return;

   ParseAndExecute(response);
}

//+------------------------------------------------------------------+
void ParseAndExecute(string json) {
   int pos = 1;
   int len = StringLen(json);

   while (pos < len) {
      int start = StringFind(json, "{", pos);
      if (start < 0) break;

      int end = StringFind(json, "}", start);
      if (end < 0) break;

      string obj = StringSubstr(json, start, end - start + 1);
      pos = end + 1;

      Execute(obj);
   }
}

//+------------------------------------------------------------------+
void Execute(string cmd) {
   string id     = GetStr(cmd, "id");
   string action = GetStr(cmd, "action");
   string symbol = GetStr(cmd, "symbol");

   if (action == "open") {
      string type   = GetStr(cmd, "type");
      double volume = GetNum(cmd, "volume");
      double sl     = GetNum(cmd, "sl");
      double tp     = GetNum(cmd, "tp");
      CmdOpen(id, symbol, type, volume, sl, tp);
   } else if (action == "close") {
      int ticket = (int)GetNum(cmd, "ticket");
      CmdClose(id, ticket);
   } else if (action == "modify") {
      int ticket   = (int)GetNum(cmd, "ticket");
      double sl    = GetNum(cmd, "sl");
      double tp    = GetNum(cmd, "tp");
      CmdModify(id, ticket, sl, tp);
   }
}

//+------------------------------------------------------------------+
void CmdOpen(string cmdId, string symbol, string type, double volume,
             double sl, double tp) {
   if (!SymbolSelect(symbol, true)) {
      SendResult(cmdId, 0, false, "Symbol not found: " + symbol);
      return;
   }

   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);

   bool ok = false;
   if (type == "buy")
      ok = Trade.Buy(volume, symbol, ask, sl, tp, "RapidFX");
   else if (type == "sell")
      ok = Trade.Sell(volume, symbol, bid, sl, tp, "RapidFX");

   ulong ticket = Trade.ResultOrder();
   if (ok) {
      Print("OPEN ", type, " ", symbol, " vol=", volume, " ticket=", ticket);
      SendResult(cmdId, ticket, true, NULL);
   } else {
      int err = GetLastError();
      Print("FAIL OPEN ", type, " ", symbol, " err=", err);
      SendResult(cmdId, ticket, false, IntegerToString(err));
   }
}

//+------------------------------------------------------------------+
void CmdClose(string cmdId, int ticket) {
   if (Trade.PositionClose(ticket)) {
      Print("CLOSE position ", ticket);

      string closeJson = "{\"ticket\":" + IntegerToString(ticket) +
         ",\"price\":0,\"profit\":0,\"pips\":0}";

      char data[], result[];
      string resultHeaders;
      StringToCharArray(closeJson, data, 0, StringLen(closeJson));
      WebRequest("POST", gServerUrl + "/ea/close",
         "Content-Type: application/json\r\n", 3000, data, result, resultHeaders);

      SendResult(cmdId, ticket, true, NULL);
   } else {
      int err = GetLastError();
      Print("FAIL CLOSE ", ticket, " err=", err);
      SendResult(cmdId, ticket, false, IntegerToString(err));
   }
}

//+------------------------------------------------------------------+
void CmdModify(string cmdId, int ticket, double sl, double tp) {
   if (Trade.PositionModify(ticket, sl, tp)) {
      Print("MODIFY ", ticket, " sl=", sl, " tp=", tp);
      SendResult(cmdId, ticket, true, NULL);
   } else {
      int err = GetLastError();
      Print("FAIL MODIFY ", ticket, " err=", err);
      SendResult(cmdId, ticket, false, IntegerToString(err));
   }
}

//+------------------------------------------------------------------+
void SendResult(string cmdId, ulong ticket, bool success, string error) {
   string s = "{";
   s += "\"commandId\":\"" + cmdId + "\",";
   s += "\"ticket\":"  + IntegerToString(ticket) + ",";
   s += "\"success\":" + (success ? "true" : "false") + ",";
   s += "\"error\":"   + (error == NULL ? "null" : "\"" + error + "\"");
   s += "}";

   char data[], result[];
   string resultHeaders;
   StringToCharArray(s, data, 0, StringLen(s));
   WebRequest("POST", gServerUrl + "/ea/result",
      "Content-Type: application/json\r\n", 3000, data, result, resultHeaders);
}

//+------------------------------------------------------------------+
string GetStr(string json, string key) {
   string q = "\"" + key + "\":\"";
   int start = StringFind(json, q);
   if (start < 0) return "";
   start += StringLen(q);
   int end = StringFind(json, "\"", start);
   if (end < 0) return "";
   return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
double GetNum(string json, string key) {
   string q = "\"" + key + "\":";
   int start = StringFind(json, q);
   if (start < 0) return 0;
   start += StringLen(q);

   int end = start;
   int len = StringLen(json);
   while (end < len) {
      ushort ch = StringGetCharacter(json, end);
      if (ch == ',' || ch == '}' || ch == ']') break;
      end++;
   }
   return StringToDouble(StringSubstr(json, start, end - start));
}
//+------------------------------------------------------------------+
