module.exports = {
  sourceDirectory: "scopes/cs",
  rules: [
    {
      match: /\.sn\.ts$/,
      plugins: [
        {
          name: "typescript-plugin",
          options: {
            transpile: false,
          },
        },
        {
          name: "babel-plugin",
          options: {
            presets: ["@nuvolo/sn-ts"],
          },
        },
      ],
    },
    {
      match: /\.ts$/,
      plugins: [
        {
          name: "typescript-plugin",
          options: {
            transpile: false,
          },
        },
        {
          name: "babel-plugin",
          options: {
            presets: [
              [
                "@babel/env",
                {
                  useBuiltIns: "entry",
                  targets: { ie: "10" },
                  corejs: { version: 3 },
                },
              ],
              "@babel/typescript",
            ],
            plugins: [
              "remove-modules",
              "@babel/proposal-class-properties",
              "@babel/proposal-object-rest-spread",
            ],
          },
        },
      ],
    },
  ],
  excludes: {
    sp_rectangle_menu_item: true,
    x_nuvo_csd_task_routing_rule: true,
    x_nuvo_mobile_schema: true,
    sys_hub_flow_input: true,
    sys_hub_action_input: true,
    sys_hub_action_output: true,
    sys_hub_step_ext_input: true,
    sys_hub_step_ext_output: true,
    content_block_header: true,
    content_block_iframe: true,
    content_block_menu: true,
    content_css: true,
    x_nuvo_eam_cad_embedded_ui_instructions: true,
    x_nuvo_eam_export_field_map: true,
    x_nuvo_eam_kpi_metric_definition: true,
    x_nuvo_eam_state_definition: true,
    x_nuvo_eam_ui_page_applications: true,
    x_nuvo_mobile_properties: true,
    x_nuvo_mobile_schema: true,
    x_nuvo_mobile_schema_columns: true,
  },
  includes: {
    x_nuvo_mobile_widget_definition: {
      template: {
        type: "html",
      },
    },
    content_css: false,
  },
  tableOptions: {
    catalog_script_client: {
      differentiatorField: ["cat_item", "variable_set", "sys_id"],
    },
    catalog_ui_policy: {
      differentiatorField: ["catalog_item", "variable_set", "sys_id"],
    },
    sys_script: {
      differentiatorField: ["collection", "sys_id"],
    },
    sys_script_client: {
      differentiatorField: ["table", "sys_id"],
    },
    sys_ui_action: {
      differentiatorField: "sys_id",
    },
    sys_ws_operation: {
      differentiatorField: "web_service_definition",
    },
    sysevent_script_action: {
      differentiatorField: "event_name",
    },
    x_nuvo_eam_guided_workflow_steps: {
      differentiatorField: "guided_workflow_recipe",
    },
    x_nuvo_mobile_nuvolo_property: {
      differentiatorField: "context",
    },
    x_nuvo_mobile_ui_action_definition: {
      differentiatorField: "function_name",
    },
    x_nuvo_mobile_widget_definition: {
      differentiatorField: ["application", "sys_id"],
    },
  },
};
