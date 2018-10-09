<script>
export default {
  name: "DossierCreator",
  props: {
    value: {
      type: Boolean,
      required: true
    },
    initialTitle: {
      type: String
    },
    initialLocation: {
      type: String
    },
    image: {
      type: String
    }
  },
  data() {
    return {
      valid: false,
      title: this.initialTitle,
      location: this.initialLocation,
      occurence: "",
      disease: "",
      titleRules: [v => !!v || "Title is required"]
    };
  },
  created() {},
  methods: {
    submit() {
      var image = new Image();
      image.src = this.image;
      var item = {
        dataSource: "Geoviz",
        title: this.title,
        sourceDate: BSVE.api.dates.yymmdd(Date.now()),
        itemDetail: {
          statusIconType: "Graph",
          Description: image.outerHTML,
          What: this.disease,
          When: this.occurence,
          Where: this.location
        }
      };

      BSVE.api.tagItem(item, "IOI", itemId => {
        this.$emit("input", false);
      });
    }
  }
};
</script>

<template>
  <v-dialog 
    :value="value"
    @input="$emit('input', $event)"
    width="300">
    <v-form v-model="valid">
      <v-card>
        <v-card-title
          class="headline grey lighten-2"
          primary-title>
          Dossier item info
        </v-card-title>
        <v-card-text>
            <v-text-field
              v-model="title"
              :rules="titleRules"
              label="Title"
              required>
            </v-text-field>
            <v-text-field
              v-model="location"
              label="Location">
            </v-text-field>
            <v-text-field
              v-model="occurence"
              label="Occurence">
            </v-text-field>
            <v-text-field
              v-model="disease"
              label="Disease">
            </v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            :disabled="!valid"
            @click="submit">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-dialog>
</template>
