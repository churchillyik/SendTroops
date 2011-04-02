//Class TransportAction
function TransportAction(village1, village2, cargo, freights) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(village1.id);
	
	this.village1 = village1;
	this.village2 = village2;
	this.cargo = cargo;
	this.freights = freights;
}

TransportAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		postMessage("从 " + this.village1.coordStr + " 到 " + this.village2.coordStr + " 运输" + this.freights + "车: " + this.cargo);
		var param = "id=" + this.village1.marketId;//hidden param
		param += "&r1=" + this.cargo[0];
		param += "&r2=" + this.cargo[1];
		param += "&r3=" + this.cargo[2];
		param += "&r4=" + this.cargo[3];
		var coord = getCoordinate(this.village2.coordStr);
		param += "&dname=";//村庄名字
		param += "&x=" + coord.x;//坐标x
		param += "&y=" + coord.y;//坐标y
		this.sendRequest("build.php", param, this.action1);
		//postMessage(param);
	}
	,
	action1:	function(doc) 
	{
		if (doc.indexOf("在市场你可以和其他玩家交易资源") < 0) 
		{
			postMessage("未打开 市场/运输 页面");
			this.end(RETRY);
			return;
		}
		if (doc.indexOf('<p class="b c5">') >= 0) 
		{
			//<p class="b c5">现有资源太少</p>
			postError( "市场报错: "+ getStrBetween(doc, '<p class="b c5">', '</p>', null) );
			this.end(ERROR);
			return;
		}
		
		var form = getStrBetween(doc, '<form method="POST" name="snd" action="build.php">', '<input type="image" value="ok"', 10000);
		var param = "";
		for (var i=0; i<8; i++) 
		{
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text" || type == "Text") 
			{
				param += name+"="+value+"&";
			}
			form = startFromStr(form, input, 2000);
		}
		
		var sDuration = getStrBetween(doc, "需时:</td><td>", "</td>", null);//需时:</td><td>0:03:32</td>
		var iDuration = parseTime(sDuration);
		
		postMessage("确认运输 需时: "+sDuration+" 小时");
		this.sendRequest("build.php", param, this.action2);
		//postMessage(param);
	}
	,
	action2:	function(doc) 
	{
		if (doc.indexOf("资源已被运送") < 0) 
		{
			postMessage("未打开 运输成功 页面");
		}
		postMessage("资源已被运送");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******