<template>
  <div class="container">
    <div class="relative flex items-center justify-center px-2">
      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-2 gap-8 mb-16"
      >
        <div
          v-for="item in items"
          :key="item.message"
          class="flex items-center justify-center rounded overflow-hidden shadow-xl"
        >
          <a :href="item.demo" target="_blank" class="sm:block">
            <img
              class="object-cover w-full h-64 md:h-84"
              :src="item.url"
              alt=""
            />
            <div class="px-6 py-4 bg-white h-16 border-t">
              <p class="text-gray-700 text-base">
                {{ item.metadata.description }}
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import S3 from 'aws-sdk/clients/s3';

const s3 = new S3({
  endpoint: 'sfo2.digitaloceanspaces.com',
  accessKeyId: 'OKEDT5C5SPIP7MT7FG75',
  secretAccessKey: 't085pMrS7JUHfM4dbYE/obqQwUspLrMuQ0N4Tqo2cvs',
});

export default Vue.extend({
  components: {},

  async asyncData({ params }) {
    const s3Params = {
      Bucket: 'sanderblue',
      Prefix: 'sanderblue.com',
    };

    try {
      const result = await s3.listObjects(s3Params).promise();

      console.log('result:', result);

      if (!result.Contents) {
        console.log('Error: No S3 Contents!');
        return;
      }

      const items = await Promise.all(
        result.Contents.map(async (obj: S3.Object) => {
          if (!obj || !obj.Key) {
            return;
          }

          const metadata = await s3
            .headObject({
              Bucket: 'sanderblue',
              Key: obj.Key,
            })
            .promise();

          return {
            url: `https://sanderblue.sfo2.cdn.digitaloceanspaces.com/${obj.Key}`,
            metadata: metadata.Metadata,
          };
        }).slice(1),
      );

      return {
        items,
      };
    } catch (error) {
      console.log(error, error.stack);
    }
  },

  mounted() {
    console.log('THIS:', this);
  },

  data() {
    return {
      items: [
        // {
        //   title: '',
        //   description: '',
        //   url: `${digitalOceanSpacesUrl}/20200313-IMGP8976-4.jpg`,
        //   thumbnail: '',
        //   tags: [],
        // },
        // {
        //   title: '',
        //   description: '',
        //   url: `${digitalOceanSpacesUrl}/20200130-IMGP7835.jpg`,
        //   thumbnail: '',
        //   tags: [],
        // },
        // {
        //   title: '',
        //   description: '',
        //   url: `${digitalOceanSpacesUrl}/IMGP2803-6.jpg`,
        //   thumbnail: '',
        //   tags: [],
        // },
      ],
    };
  },
});
</script>

<style lang="scss" scoped></style>
