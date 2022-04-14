export type FileItem = {
  name: string;
  type: string;
};

export type TableItem = {
  differentiatorField?: string | string[];
  displayField?: string;
  files?: FileItem[] | string[];
};

export type TableData = Record<string, TableItem>;

export type TableInfo = Record<
  string,
  {
    name: string;
    files: FileItem[];
    displayField: string;
    differentiatorField: string | string[];
    fields: string[];
  }
>;

export type RecordItem = Record<
  string,
  { value: string; displayValue: string }
>;

export const sincConfigDefault: TableData = {
  sysauto_script: {
    files: [
      {
        name: "condition",
        type: "js",
      },
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sys_extension_point: {
    files: [
      {
        name: "example",
        type: "js",
      },
    ],
  },
  sys_script: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
    differentiatorField: ["collection", "sys_id"],
  },
  sys_script_include: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sys_ui_action: {
    files: [
      {
        name: "client_script_v2",
        type: "js",
      },
      {
        name: "script",
        type: "js",
      },
    ],
    differentiatorField: "sys_id",
  },
  sys_ws_operation: {
    files: [
      {
        name: "operation_script",
        type: "js",
      },
    ],
    differentiatorField: "web_service_definition",
  },
  sysevent_email_action: {
    files: [
      {
        name: "advanced_condition",
        type: "js",
      },
      {
        name: "digest_html",
        type: "html",
      },
      {
        name: "digest_separator_html",
        type: "html",
      },
      {
        name: "message_html",
        type: "html",
      },
    ],
  },
  sys_script_client: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
    differentiatorField: ["table", "sys_id"],
  },
  sys_ui_page: {
    files: [
      {
        name: "client_script",
        type: "js",
      },
      {
        name: "html",
        type: "xml",
      },
      {
        name: "processing_script",
        type: "js",
      },
    ],
  },
  catalog_script_client: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
    differentiatorField: ["cat_item", "variable_set", "sys_id"],
  },
  sp_instance_menu: {
    files: [
      {
        name: "css",
        type: "css",
      },
      {
        name: "widget_parameters",
        type: "js",
      },
    ],
  },
  sp_instance_vlist: {
    files: [
      {
        name: "css",
        type: "css",
      },
      {
        name: "widget_parameters",
        type: "js",
      },
    ],
  },
  sp_page: {
    files: [
      {
        name: "css",
        type: "css",
      },
    ],
  },
  sysevent_script_action: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
    differentiatorField: "event_name",
  },
  sys_ui_macro: {
    files: [
      {
        name: "xml",
        type: "xml",
      },
    ],
  },
  sys_ui_script: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sys_sg_data_item: {
    files: [
      {
        name: "query_condition_script",
        type: "js",
      },
    ],
  },
  sys_sg_write_back_action_item: {
    files: [
      {
        name: "execution_script",
        type: "js",
      },
    ],
  },
  sys_script_fix: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sysevent_email_template: {
    files: [
      {
        name: "message_html",
        type: "html",
      },
    ],
  },
  sc_cat_item_content: {
    files: [
      {
        name: "delivery_plan_script",
        type: "js",
      },
      {
        name: "entitlement_script",
        type: "js",
      },
    ],
  },
  sp_widget: {
    files: [
      {
        name: "client_script",
        type: "js",
      },
      {
        name: "css",
        type: "css",
      },
      {
        name: "link",
        type: "js",
      },
      {
        name: "script",
        type: "js",
      },
      {
        name: "template",
        type: "html",
      },
    ],
  },
  sys_script_email: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  catalog_ui_policy: {
    files: [
      {
        name: "script_false",
        type: "js",
      },
      {
        name: "script_true",
        type: "js",
      },
    ],
    differentiatorField: ["catalog_item", "variable_set", "sys_id"],
  },
  cmn_map_page: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  ecc_agent_script_include: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  scheduled_import_set: {
    files: [
      {
        name: "partition_script",
        type: "js",
      },
      {
        name: "post_script",
        type: "js",
      },
      {
        name: "pre_script",
        type: "js",
      },
      {
        name: "condition",
        type: "js",
      },
    ],
  },
  sp_angular_provider: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sp_css: {
    files: [
      {
        name: "css",
        type: "css",
      },
    ],
  },
  sp_header_footer: {
    files: [
      {
        name: "client_script",
        type: "js",
      },
      {
        name: "css",
        type: "css",
      },
      {
        name: "link",
        type: "js",
      },
      {
        name: "script",
        type: "js",
      },
      {
        name: "template",
        type: "html",
      },
    ],
  },
  sp_ng_template: {
    files: [
      {
        name: "template",
        type: "html",
      },
    ],
  },
  sys_data_source: {
    files: [
      {
        name: "data_loader",
        type: "js",
      },
      {
        name: "parsing_script",
        type: "js",
      },
    ],
  },
  sys_processor: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sys_ui_context_menu: {
    files: [
      {
        name: "action_script",
        type: "js",
      },
      {
        name: "dynamic_actions_script",
        type: "js",
      },
      {
        name: "on_show_script",
        type: "js",
      },
    ],
  },
  sys_ui_list_control_embedded: {
    files: [
      {
        name: "columns_condition",
        type: "js",
      },
      {
        name: "empty_condition",
        type: "js",
      },
      {
        name: "link_condition",
        type: "js",
      },
      {
        name: "new_condition",
        type: "js",
      },
    ],
  },
  sys_decision_input: {
    files: [
      {
        name: "calculation",
        type: "js",
      },
    ],
  },
  sys_email_client_template: {
    files: [
      {
        name: "body_html",
        type: "html",
      },
      {
        name: "script_from",
        type: "js",
      },
    ],
  },
  sys_recipient_qualifier: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
  },
  sys_navigator: {
    files: [
      {
        name: "script",
        type: "js",
      },
    ],
    displayField: "table",
  },
};
