// We assume that we're logged on before we do anything in here
var myJquery = require('./myJquery');

module.exports =
{
	data: {},

	formatXHTML: function(sValue, bDirection)
	{
		var aFind = [
			String.fromCharCode(8220), //“
			String.fromCharCode(8221), //”
			String.fromCharCode(8216), //‘
			String.fromCharCode(8217), //‘
			String.fromCharCode(8211), //–
			String.fromCharCode(8212), //—
			String.fromCharCode(189), //½
			String.fromCharCode(188), //¼
			String.fromCharCode(190), //¾
			String.fromCharCode(169), //©
			String.fromCharCode(174), //®
			String.fromCharCode(8230) //…  
		];	

		var aReplace = [
			'"',
			'"',
			"'",
			"'",
			"-",
			"--",
			"1/2",
			"1/4",
			"3/4",
			"(C)",
			"(R)",
			"..."
		];

		if(bDirection)
		{
			sValue= sValue.replace(/\&/g,'&amp;');
			sValue= sValue.replace(/</g,'&lt;');
			sValue= sValue.replace(/>/g,'&gt;');
			//sValue = sValue.replace(/-/g, '&#45;')
			//sValue = sValue.replace(/@/g, '&#64;')
			//sValue = sValue.replace(/\//g, '&#47;')
			//sValue = sValue.replace(/"/g, '&quot;')
			//sValue = sValue.replace(/\\/g, '&#39;')
		}
		else
		{
			sValue = sValue.replace(/\&amp;/g,'&');
			sValue = sValue.replace(/\&lt;/g,'<');
			sValue = sValue.replace(/\&gt;/g,'>');
			sValue = sValue.replace(/\&#45;/g, '-');
			sValue = sValue.replace(/\&#64;/g, '@');
			sValue = sValue.replace(/\&#47;/g, '/');
			sValue = sValue.replace(/\&quot;/g, '"');
			sValue = sValue.replace(/\&#39;/g, '\'');
			sValue = sValue.replace(/\&#239;‚&#167;,&#226;/g, '-');
			for ( var i = 0; i < aFind.length; i++ ) 
			{
				var regex = new RegExp(aFind[i], "gi");
				sValue = sValue.replace(regex, aReplace[i]);
			}
		}
		
		return sValue;	
	},

	sendLogFile: function(oParam)
	{
		var eca = module.exports;
		var bLocal = (oParam.settings.local != undefined) ? oParam.settings.local == "true" : false;
		var sHTML = '<p>' + oParam.logHTML.join('<br />') + '</p>';
		var sEmailData = 'to=' + encodeURIComponent(oParam.settings.email) +
					 '&subject=' + encodeURIComponent((oParam.errorOccurred == true || oParam.errorMinor === true ? 'ERROR ': '') + 
					 				(oParam.errorMinor === true ? (oParam.errorOccurred === true ? ':Minor ' : 'Minor Error ') : '') + 
					 				'Log File for ' + eca.data.automation.title) +
					 '&fromemail=' + encodeURIComponent(eca.data.automation.responseactionfrom) +
					 '&message=' + encodeURIComponent(sHTML) +
					 '&send=Y';

		oParam.ajax.type = 'POST';
		oParam.ajax.url = '/rpc/messaging/?method=MESSAGING_EMAIL_SEND&rf=JSON&logonkey=' + oParam.settings.user.logonkey + '&sid=' + oParam.settings.user.sid;
		oParam.ajax.data = sEmailData; 					//JSON.stringify(oEmailData);
		oParam.ajax.rf = 'JSON';
		oParam.ajax.dataType = 'JSON';
		oParam.ajax.success = function(bErr, oResponse, oParam)
		{
			if (bErr || oResponse.status != 'OK')
			{
				// Write to log file - email sending failed
				console.log("Email sending failed: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));
			}
			else 
			{
				if (bLocal) {console.log('Log file Email sent to ' + oParam.settings.email);}
			}
		};
		myJquery.ajax(oParam);
	},

	getAutomation: function(oParam, fCallBack)
	{
		var eca = module.exports;
		var bLocal   = (oParam.settings.local != undefined) ? oParam.settings.local == "true" : false;
		var oAutomation = oParam.automation;

		eca.data.automation = {};
		oParam.ajax = {};
		oParam.ajax.type = 'GET';
		oParam.ajax.url = '/ondemand/setup/?method=SETUP_AUTOMATION_SEARCH&rf=JSON&id=' + oAutomation.id + 
							'&logonkey=' + oParam.settings.user.logonkey + '&sid=' + oParam.settings.user.sid;
		oParam.ajax.data = '';
		oParam.ajax.success = function(bErr, oResponse, oParam)
		{
			if (!bErr && oResponse.status === 'OK')
			{
				eca.data.automation = oResponse.data.rows.shift();
				if (bLocal) {console.log("Automation found.." + eca.data.automation.title);}
				oParam.logHTML.push("Automation found..." + eca.data.automation.title);
				fCallBack(oParam, fCallBack);
			}
			else
			{
				// Write to the log file
				console.log("Error finding automation: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));
				oParam.logHTML.push("Error finding automation: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));

				oParam.processingStep = -1;
				fCallBack(oParam, fCallBack);
			}
		}
		myJquery.ajax(oParam);
	},

	getNetworkUsers: function(oParam, fCallBack)
	{
		// Get list of users in network group
		var eca = module.exports;
		var bLocal   = (oParam.settings.local != undefined) ? oParam.settings.local == "true" : false;
		var bTesting = (oParam.settings.testing != undefined) ? oParam.settings.testing == "true" : false;

		var oSearch = 
		{
			fields: 
			[
				{"name": "usernetworkgroup.user.contactperson"},
				{"name": "usernetworkgroup.user.contactperson.email"},
				{"name": "usernetworkgroup.user.contactpersontext"},
				{"name": 'usernetworkgroup.user.id'}
			],
			filters:
			[
				{"name": "networkgroup", comparison: "EQUAL_TO", value1: eca.data.automation.responseactioncontext}
			],
			options:
			{
				"rf": "JSON",
				"rows": "100"
			}
		};

		if (oParam.addSearchFields)
		{
			for (var i=0; i < oParam.addSearchFields.length; i++)
			{
				oSearch.fields.push({"name": oParam.addSearchFields[i]});
			};
			delete(oParam.addSearchFields);
		}

		if (oParam.addSearchFilters)
		{
			for (var i=0; i < oParam.addSearchFilters.length; i++)
			{
				oSearch.filters.push(oParam.addSearchFilters[i]);
			};
			delete(oParam.addSearchFilters);
		}

		eca.data.userContext = [];
		oParam.ajax = {};
		//if (bTesting && !bLab)
		//{
		//	oSearch.filters.push({"name": "usernetworkgroup.user.contactperson", comparison: "EQUAL_TO", value1: "1000505873"});
		//}
		
		oParam.ajax.type = 'POST';
		oParam.ajax.url = '/rpc/setup/?method=SETUP_USER_NETWORK_GROUP_SEARCH&advanced=1&rf=JSON&logonkey=' + oParam.settings.user.logonkey + '&sid=' + oParam.settings.user.sid;
		oParam.ajax.data = JSON.stringify(oSearch);
		oParam.ajax.success = function(bErr, oResponse, oParam)
		{
			if (!bErr && oResponse.status === 'OK')
			{
				if (bLocal) {console.log(oResponse.data.rows.length + " Network Group Users found..");}
				oParam.logHTML.push(oResponse.data.rows.length + " Network Group Users found..");

				eca.data.userContext = oResponse.data.rows;
				fCallBack(oParam, fCallBack);
			}
			else
			{
				// Write to the log file
				console.log("Error finding network groups: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));
				oParam.logHTML.push("Error finding network groups: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));

				oParam.processingStep = -1;
				fCallBack(oParam, fCallBack);
			}
		}
		myJquery.ajax(oParam);
	
	},

	sendEmail: function(oParam, fCallBack)
	{
		// If we're in testing mode, send to currently logged on person, otherwise send to email of current userData index
		var eca = module.exports;
		var bLocal = (oParam.settings.local != undefined) ? oParam.settings.local == "true" : false;

		var aHTML = [];
		var eca = module.exports;
		var oEmailData = {};
		var bTesting = (oParam.settings.testing != undefined) ? oParam.settings.testing == "true" : false;
		var sEmailTo = (bTesting) ? oParam.settings.email : eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactperson.email'];

		var fFunctionHeader = oParam.functionEmailHeader;
		var fFunctionRow = oParam.functionEmailRow;

		aHTML.push('<table class="eca"><tr class="eca">');

		aHTML.push(fFunctionHeader());

		aHTML.push('</tr>');

		for (var index = 0; index < eca.data.automationResponseRows.length; index++)
		{
			var row = eca.data.automationResponseRows[index];

			aHTML.push(fFunctionRow(row));
		}

		aHTML.push('</table><br /><br />');

		if (bTesting)
		{
			aHTML.push('<br />' + eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactpersontext'] + 
							'(' + eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.id'] + ')');
		}
		aHTML.push('<br /><br />');


		if (eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactperson.email'] != '')
		{
			//debugger;
			oEmailData.to = sEmailTo;
			oEmailData.subject = eca.data.automation.title;
			oEmailData.fromemail = eca.data.automation.responseactionfrom;
			oEmailData.message = aHTML.join('');
			oEmailData.saveagainstobject = '32';
			oEmailData.saveagainstobjectcontext = eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactperson'];
			oEmailData.save = 'Y';
			oEmailData.applysystemtemplate = 'Y';
			oEmailData.send = 'Y';

			var sEmailData = '';
			sEmailData += 'to=' + encodeURIComponent(sEmailTo) +
						 '&subject=' + encodeURIComponent(eca.data.automation.title) +
						 '&fromemail=' + encodeURIComponent(eca.data.automation.responseactionfrom) +
						 '&message=' + encodeURIComponent(aHTML.join('')) +
						 '&saveagainstobject=' + encodeURIComponent(32) +
						 '&saveagainstobjectcontext=' + eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactperson'] +
						 '&save=Y' +
						 '&applysystemtemplate=Y' +
						 '&send=Y';

			oParam.ajax.type = 'POST';
			oParam.ajax.url = '/rpc/messaging/?method=MESSAGING_EMAIL_SEND&rf=JSON&logonkey=' + oParam.settings.user.logonkey + '&sid=' + oParam.settings.user.sid;
			oParam.ajax.data = sEmailData; 					//JSON.stringify(oEmailData);
			oParam.ajax.rf = 'JSON';
			oParam.ajax.dataType = 'JSON';
			oParam.ajax.success = function(bErr, oResponse, oParam)
			{
				if (bErr || oResponse.status != 'OK')
				{
					// Write to log file - email sending failed
					console.log("Email sending failed: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));
					oParam.errorMinor = true;
					oParam.logHTML.push("Email sending failed: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));

				}
				else 
				{
					if (bLocal) {console.log('Email sent to ' + oEmailData.to);}
					oParam.logHTML.push('Email sent to ' + oEmailData.to);
					
				}

				oParam.userIndex += 1;			// Go to next automation call
				fCallBack(oParam, fCallBack);
			};
			myJquery.ajax(oParam);
		}
		else
		{
			// write to log file - no email address
			console.log("Email sending failed: No email address");
			oParam.logHTML.push("Email sending failed: No email address");

			oParam.errorMinor = true;
			oParam.userIndex += 1;
			fCallBack(oParam, fCallBack);
		}
	},

	pendingAuditsToSetToCE: 
	{
		preProcess: function(oParam, fCallBack)
		{
			// Get list of Pending Audits that need to be moved to CE because they have only minor CARS and it's after 29 days
			// Calls AUDIT_SEARCH first and then AUDIT_ISSUE_SEARCH to determine if has only Minor CARS and after 29 days


			// Steps are:
			// 1. Get list of users in auditor network group including contactperson and email address
			// 2. For each Auditor business, do steps 3 - 5 
			// 3. Get all Pending Audits for this Auditor Business
			// 4. Get a list of all CARS for these audits  using AUDIT_ISSUE_SEARCH to find open CARS for this audit
			// 5. Determine if the audit fits the criteria and if so, send the email to the newtowk group user, saving against contactbusiness

			var eca = module.exports;
			var oAutomation;
			var bTesting = (oParam.settings.testing != undefined) ? oParam.settings.testing == "true" : false;
			var bLocal   = (oParam.settings.local   != undefined) ? oParam.settings.local == "true"   : false;
			var bLab = false;
			var iPending = (bLab) ? '21' : '10';
			
			//debugger;
			for (var i = 0; i < oParam.settings.automations.length; i++)
			{
				if (oParam.settings.automations[i].functionName === "pendingAuditsToSetToCE")
				{
					oAutomation = oParam.settings.automations[i];
				}
			}

			oParam.functionEmailHeader = eca.pendingAuditsToSetToCE.emailHeader;
			oParam.functionEmailRow = eca.pendingAuditsToSetToCE.emailRow;

			if (oParam)
			{	if (oParam.processingStep === undefined) {oParam.processingStep = 1}}
			else { oParam = {processingStep: 1}}

			// Get a list of Auditor networkgroup Users including contactbusiness
			if (oParam.processingStep === 1)
			{
				oParam.logHTML = [];
				console.log(Date());
				oParam.logHTML.push(Date());

				console.log("#AUTOMATION_SETTINGS: " + JSON.stringify(oAutomation));

				oParam.processingStep = 2;
				if (bLab)
				{
					eca.data.automation = 
					{
						responseactioncontext: '84', 
						xhtmlahref: 'https://eca.lab.ibcom.biz/#/nsECA-admin.audit/id:',
						title: oAutomation.name,
						responseactionfrom: 'admin@schemesupport.com.au'
					};
				}
				else
				{
					eca.data.automation = 
					{
						responseactioncontext: '993', 
						xhtmlahref: 'https://eca-iso.1blankspace.com/#/nsECA-admin.audit/id:',
						title: oAutomation.name,
						responseactionfrom: 'system@schemesupport.com.au'
					};
				}

				oParam.addSearchFields = ["usernetworkgroup.user.contactbusiness", "usernetworkgroup.user.contactbusinesstext"]
				eca.getNetworkUsers(oParam, fCallBack);
			}

			// Get list of Pending Audits for each Network Group business
			else if (oParam.processingStep === 2)
			{
				var dCompare = new Date();
				dCompare = new Date(dCompare.setHours(dCompare.getHours() + 10));	// Adjust for UTC since it's run on the server
				dCompare = new Date(dCompare.setDate(dCompare.getDate() -29));		// v0.1.03 Get date 29 (not 28) days ago
				var sCompare = myJquery.dateString(dCompare);

				if (oParam.userIndex === undefined) {oParam.userIndex = 0}

				if (oParam.userIndex < eca.data.userContext.length)
				{
					eca.data.automationResponseRows = [];
					delete(oParam.pendingAudits);

					var oUser = eca.data.userContext[oParam.userIndex];
					var iAuditorBusiness = oUser['usernetworkgroup.user.contactbusiness'];
					
					// Find any pending audits
					debugger;

 					var oSearch = 
					{	
						fields: 
						[
							{"name": "audit.agrisubscription.membershiptext"},
							{"name": "contactbusinesstext"},
							{"name": "audit.contactbusiness.legalname"},
							{"name": "audit.contactperson.firstname"},
							{"name": "audit.contactperson.surname"},
							{"name": "scheduleddate"},
							{'name': 'actualdate'},
							{'name': 'resultstatus'},
							{"name": 'resultstatustext'},
							{"name": "contactbusiness"},
							{"name": "teamleadercontactpersontext"},
							{"name": "auditbusiness"},
							{"name": "auditbusinesstext"}
						],
						filters:
						[
							{
								"name": "auditbusiness",
								"comparison": "EQUAL_TO",
								"value1": iAuditorBusiness
							},
							{
								"name": "resultstatus",
								"comparison": "EQUAL_TO",
								"value1": iPending
							},
							{
								"name": "actualdate", 
								"comparison": "LESS_THAN",
								"value1": sCompare + " 23:59:59"
							},
							{
								"name": "("
							},
							{
								'name': 'membershipstatus',
								'comparison': 'NOT_EQUAL_TO',
								'value1': '-1' 
							},
							{
								"name": "or"
							},
							{
								'name': 'membershipstatus',
								'comparison': 'IS_NULL'
							},
							{
								"name": ")"
							}
						],
						options:
						{
							"rf": "JSON",
							"rows": "500"
						}
					};

					oParam.ajax = {};
					oParam.ajax.type = 'POST';
					oParam.ajax.url = '/rpc/audit/?method=AUDIT_SEARCH&rf=JSON&advanced=1' +
										'&logonkey=' + oParam.settings.user.logonkey + '&sid=' + oParam.settings.user.sid;
					oParam.ajax.data = JSON.stringify(oSearch);
					oParam.ajax.success = function(bErr, oResponse, oParam)
					{
						if (!bErr && oResponse.status === 'OK')
						{
							if (oResponse.data.rows.length > 0)
							{
								eca.data.automationResponseRows = oResponse.data.rows;
								if (bLocal) {console.log("Pending Audits found for " + eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactbusinesstext'] + 
																							": " + eca.data.automationResponseRows.length + ' rows');}
								oParam.logHTML.push("Audits found for " + eca.data.userContext[oParam.userIndex]['usernetworkgroup.user.contactbusinesstext'] + 
																": " + eca.data.automationResponseRows.length + ' rows');

								// Now search for CARS since there were audits
								var oSearch =
								{
									fields:
									[
										{'name': 'audit'},
										{'name': 'status'},
										{'name': 'type'}
									],
									filters:
									[
										{
											'name': 'audit',
											'comparison': 'IN_LIST',
											'value1': myJquery.map(eca.data.automationResponseRows, function(x) {return x.id}).join(',')
										},
										{
											'name': 'status',
											'comparison': 'EQUAL_TO',
											'value1': '1'  /* To Be Completed lab & prod*/
										}
									],
									options:
									{
										"rf": "JSON",
										"rows": "500"
									}
								}

								oParam.ajax = {};
								oParam.ajax.type = 'POST';
								oParam.ajax.url = '/rpc/audit/?method=AUDIT_ISSUE_SEARCH&rf=JSON&advanced=1' +
													'&logonkey=' + oParam.settings.user.logonkey + '&sid=' + oParam.settings.user.sid;
								oParam.ajax.data = JSON.stringify(oSearch);
								oParam.ajax.success = function(bErr, oResponse, oParam)
								{
									if (!bErr && oResponse.status === 'OK')
									{
										// Work out which audits only have open minor cars
										var oCARResponseRows = oResponse.data.rows;
										for (var i=0; i < eca.data.automationResponseRows.length; i++)
										{
											var row = eca.data.automationResponseRows[i];
											//Check for Major (5) / Critical (4) CARS
											var bHasOpenMajors = myJquery.grep(oCARResponseRows, function(x)
											{
												return x.audit === row.id && (x.type === '5' || x.type === '4')
											}).length > 0;

											// Check for Minor (6) CARS
											if (!bHasOpenMajors)
											{
												eca.data.automationResponseRows[i].openMinors = myJquery.grep(oCARResponseRows, 
																		function(x) {return x.audit === row.id && x.type === '6'}).length;
											}
											else
											{	//v1.0.2a SUP022042 was using oParam.compare instead of compareDate
												eca.data.automationResponseRows[i].openMinors = -1;
											}
										}

										// Now remove all the rows where openMinors < 0
										eca.data.automationResponseRows = myJquery.grep(eca.data.automationResponseRows, function(x) {return x.openMinors >= 0});
		
										// Send email if any rows left
										if (eca.data.automationResponseRows.length > 0)
										{
											eca.sendEmail(oParam, fCallBack);
										}
										// Otherwise, just go to next network group user
										else
										{
											oParam.userIndex += 1;
											fCallBack(oParam, fCallBack);
										}
									}
									// Error has occurred
									else
									{
										// Write to the log file - AUDIT_ISSUE_SEARCH failed
										console.log("Error calling AUDIT_ISSUE_SEARCH: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));
										oParam.logHTML.push("Error calling  AUDIT_ISSUE_SEARCH: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));

										oParam.processingStep = -1;
										fCallBack(oParam, fCallBack);
									}
								}

								myJquery.ajax(oParam);
							}

							// No Audits, just loop around to next network group user
							else
							{
								oParam.userIndex += 1;
								fCallBack(oParam, fCallBack);
							}
						}

						else
						{
							// Write to the log file - AUDIT_SEARCH failed
							console.log("Error calling AUDIT_SEARCH: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));
							oParam.logHTML.push("Error calling  AUDIT_SEARCH: " + ((oResponse && oResponse.status === 'ER') ? oResponse.error.errornotes : ''));

							oParam.processingStep = -1;
							fCallBack(oParam, fCallBack);
						}
					}

					myJquery.ajax(oParam);
				}
				else
				{
					// We're all done
					console.log(Date() + " All done..");
					oParam.logHTML.push(Date() + " All done..");

					debugger;
					oParam.processingStep = 6;
					fCallBack(oParam, fCallBack);
				}
			}

			// All done sucessfully
			else if (oParam.processingStep === 6 || oParam.processingStep === -1)
			{
				debugger;
				oParam.errorOccurred = (oParam.processingStep === -1);
				eca.sendLogFile(oParam);
			}
		},

		emailHeader: function()
		{
			return '<td style="padding:5px;"><strong>Business Name</strong></td>' +
					'<td style="padding:5px;"><strong>Membership</strong></td>' +
					'<td style="padding:5px;"><strong>Contact</strong></td>' +
					'<td style="padding:5px;"><strong>Audit Date</strong></td>' +
					'<td style="padding:5px;"><strong>Status</strong></td>' +
					'<td style="padding:5px;"><strong>Minor CARs</strong></td>';
		},

		emailRow: function(oRow)
		{
			var eca = module.exports;
			var aHTML = [];
			var sAHREF = eca.data.automation.xhtmlahref;
			var sBusinessName = (oRow['audit.contactbusiness.legalname'] != oRow['contactbusinesstext'])
								? oRow['audit.contactbusiness.legalname'] + '<br />(' + oRow['contactbusinesstext'] + ')'
								: oRow['audit.contactbusiness.legalname']


			aHTML.push('<tr id="tr_' + oRow.id + '">');
			
			aHTML.push('<td class="eca" style="vertical-align:top;padding:5px;">' + 
							'<a href="' + eca.formatXHTML(sAHREF) + oRow.id + '" target="_blank" class="eca">' + 
								eca.formatXHTML(sBusinessName) + '</a>' +
						'</td>');

			aHTML.push('<td style="padding:5px;" class="ns1blankspaceRow">' + oRow['audit.agrisubscription.membershiptext'] + '</td>');

			aHTML.push('<td style="padding:5px;" class="ns1blankspaceRow ns1blankspaceRowContact">' +
									oRow['audit.contactperson.firstname'] + ' ' + oRow['audit.contactperson.surname'] + '</td>');

			aHTML.push('<td style="padding:5px;" class="ns1blankspaceRow">' +oRow['actualdate'] + '</td>');

			aHTML.push('<td style="padding:5px;" class="ns1blankspaceRow">' +oRow['resultstatustext'] + '</td>');

			aHTML.push('<td style="padding:5px;text-align:center;" class="ns1blankspaceRow">' +oRow['openMinors'] + '</td>');

			aHTML.push('</tr>');

			return aHTML.join('');
		}
	}

}


