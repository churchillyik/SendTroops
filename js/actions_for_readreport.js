//Class ReadReportAction
function ReadReportAction(villageId) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
}

ReadReportAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		this.sendRequest("berichte.php", null, this.action1);
	},
	action1: function(doc) 
	{
		if (doc.indexOf("<h1>报告</h1>") < 0) 
		{
			postMessage("未打开报告页面,请访问<a href='http://" + g_sServerURL+"/berichte.php' target='blank' >这里</a>");
			this.end(SUCCESS);
			return;//Cancel Read Report Workflow
		}

		//<a href="berichte.php?id=18182548">齐格飞的鼎盛茶馆攻击无双城</a>
		var info = getStrBetween(doc, '<a href="berichte.php?id=', '</a>', null);
		if (info.indexOf(g_sTargetVillage) < 0) 
		{
			postMessage("未找到对 "+g_sTargetVillage+" 的报告,请访问<a href='"+g_sServerURL+"/berichte.php' target='blank' >这里</a>");
			this.end(SUCCESS);
			return;//Cancel Read Report Workflow
		}
		var id = endWithStr(info, '">');//18182548

		//侦察
		if (info.indexOf("侦察") >= 0) 
		{
			postMessage('侦察报告 <a target="blank" href="http://'+g_sServerURL+'/berichte.php?id='+info+'</a>');
			switchToNextTarget();
			this.end(SUCCESS);
			return;//Finished Read Report Workflow
		}

		postMessage('战斗报告 <a target="blank" href="http://'+g_sServerURL+'/berichte.php?id='+info+'</a>');
		this.sendRequest("berichte.php?id="+id, null, this.action2);
	},
	action2:	function(doc) 
	{
		if (doc.indexOf("缴获物") < 0) 
		{
			postMessage("未取得 缴获物 报告信息");
			this.end(SUCCESS);
			return;//Cancel Read Report Workflow
		}
		//<td class="s7" colspan="10"><img class="res" src="img/un/r/1.gif">22 <img class="res" src="img/un/r/2.gif">82 <img class="res" src="img/un/r/3.gif">105 <img class="res" src="img/un/r/4.gif">0</td>
			
		//T3.5
		//<div class="res"><img class="r1" src="img/x.gif" alt="木材" title="木材" />137 | <img class="r2" src="img/x.gif" alt="泥土" title="泥土" />158 | <img class="r3" src="img/x.gif" alt="铁块" title="铁块" />115 | <img class="r4" src="img/x.gif" alt="粮食" title="粮食" />40</div>

		var info = getStrBetween(doc, '<div class="res">', '</div>', 500);
		var iLoot = 0;

		//木材
		var sNumber = getStrBetween(doc, 'title="木材" />', ' |', null);
		var iNumber = parseDecimal( sNumber );
		iLoot += iNumber;
		
		//泥土
		sNumber = getStrBetween(doc, 'title="泥土" />', ' |', null);
		iNumber = parseDecimal( sNumber );
		iLoot += iNumber;

		//泥土
		sNumber = getStrBetween(doc, 'title="铁块" />', ' |', null);
		iNumber = parseDecimal( sNumber );
		iLoot += iNumber;

		//泥土
		sNumber = getStrBetween(doc, 'title="粮食" />', '</div>', null);
		iNumber = parseDecimal( sNumber );
		iLoot += iNumber;

		postMessage("缴获物共计: "+iLoot);

		g_iTotalLoot += iLoot;
		document.getElementById('status').innerHTML = "累计缴获资源 " + g_iTotalLoot;

		var iLoad = 20;//禁卫兵最低运载量20
		if (iLoad < g_taskCommand.load) //optional, can be null
		{
			iLoad = g_taskCommand.load;
		}
		if (iLoot < iLoad) 
		{
			//缴获物 < 运载量
			var messageArray = ["地主家也没有余粮了",
			                    "再去就得开奥迪回来了",
			                    "下次只能抢回伊利四个圈"];
			var index = Math.floor( Math.random() * messageArray.length );
			postMessage(messageArray[index] + "【齐格飞】");
			switchToNextTarget();
		}
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******